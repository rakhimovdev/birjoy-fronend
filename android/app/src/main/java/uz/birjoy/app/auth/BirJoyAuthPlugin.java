package uz.birjoy.app.auth;

import android.app.Activity;
import android.content.Intent;
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

    @PluginMethod
    public void signInWithGoogle(PluginCall call) {
        String serverClientId = call.getString("serverClientId", "").trim();

        if (serverClientId.isEmpty()) {
            call.reject("Google server client ID is required.");
            return;
        }

        GoogleSignInOptions signInOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(serverClientId)
            .build();
        GoogleSignInClient signInClient = GoogleSignIn.getClient(getContext(), signInOptions);

        signInClient.signOut().addOnCompleteListener(
            getActivity(),
            task -> {
                Intent signInIntent = signInClient.getSignInIntent();
                startActivityForResult(call, signInIntent, "handleGoogleSignInResult");
            }
        );
    }

    @ActivityCallback
    public void handleGoogleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Google sign-in was cancelled.");
            return;
        }

        Intent data = result.getData();
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);

        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);

            if (account == null) {
                call.reject("Google account data was not returned.");
                return;
            }

            String idToken = account.getIdToken();

            if (idToken == null || idToken.trim().isEmpty()) {
                call.reject("Google ID token is missing from the sign-in result.");
                return;
            }

            JSObject resultObject = new JSObject();
            resultObject.put("idToken", idToken);
            resultObject.put("email", account.getEmail());
            resultObject.put("displayName", account.getDisplayName());
            resultObject.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
            call.resolve(resultObject);
        } catch (ApiException exception) {
            String message = CommonStatusCodes.getStatusCodeString(exception.getStatusCode());

            if (message == null || message.trim().isEmpty()) {
                message = "Unknown Google sign-in error.";
            }

            call.reject("Google sign-in failed: " + message, exception);
        }
    }
}
