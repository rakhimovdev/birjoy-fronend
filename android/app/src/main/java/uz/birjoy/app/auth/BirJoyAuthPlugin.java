package uz.birjoy.app.auth;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "BirJoyAuth")
public class BirJoyAuthPlugin extends Plugin {
    private static final String TAG = "BirJoyAuthPlugin";
    private static final int GOOGLE_STATUS_SUCCESS = 0;

    private void emitDebug(String step, String message) {
        emitDebug(step, message, null);
    }

    private void emitDebug(String step, String message, JSObject data) {
        JSObject payload = data != null ? data : new JSObject();
        payload.put("step", step);
        payload.put("message", message);
        notifyListeners("googleAuthDebug", payload);
        Log.d(TAG, step + ": " + message + " " + payload.toString());
    }

    @PluginMethod
    public void signInWithGoogle(PluginCall call) {
        String serverClientId = call.getString("serverClientId", "").trim();
        Activity activity = getActivity();

        JSObject startData = new JSObject();
        startData.put("serverClientIdSuffix", serverClientId.length() > 18 ? serverClientId.substring(serverClientId.length() - 18) : serverClientId);
        startData.put("serverClientIdPresent", !serverClientId.isEmpty());
        startData.put("activityPresent", activity != null);
        emitDebug("plugin-call-started", "Native Google sign-in call received.", startData);

        if (serverClientId.isEmpty()) {
            emitDebug("plugin-call-rejected", "Google server client ID is missing.");
            call.reject("Google server client ID is required.");
            return;
        }

        if (activity == null) {
            emitDebug("plugin-call-rejected", "Android activity is missing.");
            call.reject("Google sign-in is not available because the Android activity is missing.");
            return;
        }

        GoogleSignInOptions signInOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(serverClientId)
            .build();
        GoogleSignInClient signInClient = GoogleSignIn.getClient(getContext(), signInOptions);

        emitDebug("plugin-signout-started", "Signing out previous Google session before showing chooser.");
        signInClient.signOut().addOnCompleteListener(activity, task -> {
            emitDebug("plugin-signout-finished", "Previous Google session sign-out completed.");
            activity.runOnUiThread(() -> {
                try {
                    emitDebug("google-signin-intent-launching", "Launching Google account picker intent.");
                    Intent signInIntent = signInClient.getSignInIntent();
                    startActivityForResult(call, signInIntent, "handleGoogleSignInResult");
                    emitDebug("google-signin-intent-launched", "Google account picker intent launched.");
                } catch (Exception exception) {
                    JSObject errorData = new JSObject();
                    errorData.put("errorMessage", exception.getMessage());
                    emitDebug("google-signin-intent-launch-failed", "Failed to launch Google sign-in intent.", errorData);
                    call.reject("Failed to launch Google sign-in intent.", exception);
                }
            });
        });
    }

    @ActivityCallback
    public void handleGoogleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            emitDebug("google-signin-callback-missing-call", "Activity callback received without a saved plugin call.");
            return;
        }

        Intent data = result.getData();
        JSObject resultData = createResultDebugData(result, data);
        emitDebug("google-signin-callback-received", "Google sign-in activity result received.", resultData);
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);

        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            appendStatusData(resultData, GOOGLE_STATUS_SUCCESS, getGoogleStatusLabel(GOOGLE_STATUS_SUCCESS));

            if (account == null) {
                appendAccountData(resultData, null, null);
                emitDebug("google-signin-account-missing", "Google account data was not returned.", resultData);
                Log.e(TAG, "google-signin-account-missing: " + resultData.toString());
                call.reject("Google account data was not returned.", "GOOGLE_ACCOUNT_MISSING", resultData);
                return;
            }

            String email = account.getEmail() != null ? account.getEmail() : "";
            String idToken = account.getIdToken();
            appendAccountData(resultData, email, idToken);

            if (idToken == null || idToken.trim().isEmpty()) {
                emitDebug("google-signin-token-missing", "Google ID token is missing from the sign-in result.", resultData);
                Log.e(TAG, "google-signin-token-missing: " + resultData.toString());
                call.reject("Google ID token is missing from the sign-in result.", "GOOGLE_ID_TOKEN_MISSING", resultData);
                return;
            }

            JSObject resultObject = new JSObject();
            resultObject.put("idToken", idToken);
            resultObject.put("email", email);
            resultObject.put("displayName", account.getDisplayName());
            resultObject.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");

            if (result.getResultCode() != Activity.RESULT_OK) {
                emitDebug(
                    "google-signin-nonstandard-success",
                    "Google sign-in returned a non-OK activity result but still produced a valid account.",
                    resultData
                );
            }

            emitDebug("google-signin-token-received", "Google ID token received from native sign-in.", resultData);
            call.resolve(resultObject);
        } catch (ApiException exception) {
            int statusCode = exception.getStatusCode();
            String statusMessage = getGoogleStatusMessage(exception);
            appendStatusData(resultData, statusCode, statusMessage);
            appendAccountData(resultData, null, null);
            resultData.put("statusLabel", getGoogleStatusLabel(statusCode));
            resultData.put("failureCategory", getGoogleFailureCategory(statusCode));
            resultData.put("exceptionClass", exception.getClass().getName());
            resultData.put("exceptionMessage", exception.getMessage() != null ? exception.getMessage() : "");

            String message = getGoogleErrorMessage(exception);
            resultData.put("errorMessage", message);
            emitDebug("google-signin-failed", "Google sign-in failed before token exchange.", resultData);
            Log.e(TAG, "google-signin-failed: " + resultData.toString(), exception);
            call.reject("Google sign-in failed: " + message, String.valueOf(statusCode), exception, resultData);
        }
    }

    private JSObject createResultDebugData(ActivityResult result, Intent data) {
        JSObject resultData = new JSObject();
        int resultCode = result.getResultCode();
        resultData.put("resultCode", resultCode);
        resultData.put("resultCodeLabel", getActivityResultCodeLabel(resultCode));
        resultData.put("intentPresent", data != null);
        resultData.put("intentAction", data != null && data.getAction() != null ? data.getAction() : "");
        resultData.put("intentExtrasPresent", data != null && data.getExtras() != null);
        return resultData;
    }

    private void appendStatusData(JSObject resultData, int statusCode, String statusMessage) {
        resultData.put("statusCode", statusCode);
        resultData.put("statusMessage", statusMessage != null ? statusMessage : "");
    }

    private void appendAccountData(JSObject resultData, String accountEmail, String idToken) {
        resultData.put("accountEmail", accountEmail != null ? accountEmail : "");
        resultData.put("idTokenLength", idToken != null ? idToken.length() : 0);
    }

    private String getActivityResultCodeLabel(int resultCode) {
        if (resultCode == Activity.RESULT_OK) {
            return "RESULT_OK";
        }

        if (resultCode == Activity.RESULT_CANCELED) {
            return "RESULT_CANCELED";
        }

        return "RESULT_" + resultCode;
    }

    private String getGoogleStatusMessage(ApiException exception) {
        String statusMessage = exception.getStatusMessage();

        if (statusMessage != null && !statusMessage.trim().isEmpty()) {
            return statusMessage;
        }

        return getGoogleStatusLabel(exception.getStatusCode());
    }

    private String getGoogleStatusLabel(int statusCode) {
        String statusLabel = CommonStatusCodes.getStatusCodeString(statusCode);

        if (statusLabel == null || statusLabel.trim().isEmpty()) {
            return "UNKNOWN_STATUS_CODE";
        }

        return statusLabel;
    }

    private String getGoogleFailureCategory(int statusCode) {
        if (statusCode == 10) {
            return "oauth_configuration_error";
        }

        if (statusCode == 16) {
            return "google_signin_unavailable";
        }

        if (statusCode == 7) {
            return "network_error";
        }

        if (statusCode == 12500) {
            return "play_services_failure";
        }

        if (statusCode == 12501) {
            return "user_cancellation";
        }

        return "google_signin_error";
    }

    private String getGoogleErrorMessage(ApiException exception) {
        int statusCode = exception.getStatusCode();

        if (statusCode == 7) {
            return "Network error. Please check your connection and try again.";
        }

        if (statusCode == 10) {
            return "Developer configuration error. Verify the Android OAuth client, package name, and SHA-1/SHA-256 fingerprints.";
        }

        if (statusCode == 16) {
            return "Google sign-in is unavailable on this device.";
        }

        if (statusCode == 12500) {
            return "Google Play Services could not complete Google sign-in on this device.";
        }

        if (statusCode == 12501) {
            return "Google sign-in was cancelled by the user.";
        }

        if (statusCode == 13) {
            return "Google Play Services returned an unexpected error while processing sign-in.";
        }

        String fallbackMessage = getGoogleStatusMessage(exception);

        if (fallbackMessage == null || fallbackMessage.trim().isEmpty()) {
            return "Unknown Google sign-in error.";
        }

        return "Google sign-in failed with status " + statusCode + " (" + fallbackMessage + ").";
    }
}
