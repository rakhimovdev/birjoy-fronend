package uz.birjoy.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import uz.birjoy.app.auth.BirJoyAuthPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "BirJoyMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "Registering BirJoyAuth plugin before BridgeActivity onCreate");
        registerPlugin(BirJoyAuthPlugin.class);
        super.onCreate(savedInstanceState);
        Log.d(TAG, "BridgeActivity onCreate completed");
    }
}
