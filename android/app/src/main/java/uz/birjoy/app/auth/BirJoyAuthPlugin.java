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

        JSObject resultData = new JSObject();
        resultData.put("resultCode", result.getResultCode());
        emitDebug("google-signin-callback-received", "Google sign-in activity result received.", resultData);

        if (result.getResultCode() != Activity.RESULT_OK) {
            emitDebug("google-signin-cancelled", "Google sign-in activity was cancelled by the user or OS.");
            call.reject("Google sign-in was cancelled.");
            return;
        }

        Intent data = result.getData();
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);

        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);

            if (account == null) {
                emitDebug("google-signin-account-missing", "Google account data was not returned.");
                call.reject("Google account data was not returned.");
                return;
            }

            String idToken = account.getIdToken();

            if (idToken == null || idToken.trim().isEmpty()) {
                emitDebug("google-signin-token-missing", "Google ID token is missing from the sign-in result.");
                call.reject("Google ID token is missing from the sign-in result.");
                return;
            }

            JSObject resultObject = new JSObject();
            resultObject.put("idToken", idToken);
            resultObject.put("email", account.getEmail());
            resultObject.put("displayName", account.getDisplayName());
            resultObject.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
            JSObject tokenData = new JSObject();
            tokenData.put("email", account.getEmail());
            tokenData.put("displayName", account.getDisplayName());
            tokenData.put("idTokenLength", idToken.length());
            emitDebug("google-signin-token-received", "Google ID token received from native sign-in.", tokenData);
            call.resolve(resultObject);
        } catch (ApiException exception) {
            String message = getGoogleErrorMessage(exception);
            JSObject errorData = new JSObject();
            errorData.put("statusCode", exception.getStatusCode());
            errorData.put("errorMessage", message);
            emitDebug("google-signin-failed", "Google sign-in failed before token exchange.", errorData);
            call.reject("Google sign-in failed: " + message, exception);
        }
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
            return "Google sign-in could not be completed on this device.";
        }

        if (statusCode == 12501 || statusCode == 13) {
            return "Google sign-in was cancelled.";
        }

        String fallbackMessage = CommonStatusCodes.getStatusCodeString(statusCode);

        if (fallbackMessage == null || fallbackMessage.trim().isEmpty()) {
            return "Unknown Google sign-in error.";
        }

        return fallbackMessage;
    }
}
