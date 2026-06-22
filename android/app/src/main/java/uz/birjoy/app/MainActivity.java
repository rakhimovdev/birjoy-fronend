package uz.birjoy.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import uz.birjoy.app.auth.BirJoyAuthPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BirJoyAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
