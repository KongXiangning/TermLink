package com.termlink.app;

import android.content.Context;
import android.util.Log;
import android.webkit.ClientCertRequest;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MtlsBridgeWebViewClient extends BridgeWebViewClient {

    private static final String TAG = "TermLink-mTLS";

    private final Context appContext;
    private final Set<String> allowedHosts;

    private final Object credentialLock = new Object();
    private PrivateKey privateKey;
    private X509Certificate[] certChain;

    public MtlsBridgeWebViewClient(Bridge bridge, Context appContext) {
        super(bridge);
        this.appContext = appContext;
        this.allowedHosts = parseAllowedHosts(BuildConfig.MTLS_ALLOWED_HOSTS);
    }

    @Override
    public void onReceivedClientCertRequest(WebView view, ClientCertRequest request) {
        if (!BuildConfig.MTLS_ENABLED) {
            request.ignore();
            return;
        }

        if (!isAllowedHost(request.getHost())) {
            request.ignore();
            return;
        }

        if (!ensureCredentialsLoaded()) {
            Log.e(TAG, "mTLS client credentials are not available.");
            request.cancel();
            return;
        }

        request.proceed(privateKey, certChain);
    }

    private boolean ensureCredentialsLoaded() {
        if (privateKey != null && certChain != null) {
            return true;
        }

        synchronized (credentialLock) {
            if (privateKey != null && certChain != null) {
                return true;
            }

            String assetPath = BuildConfig.MTLS_P12_ASSET;
            if (assetPath == null || assetPath.trim().isEmpty()) {
                Log.e(TAG, "MTLS_P12_ASSET is empty.");
                return false;
            }

            char[] password = BuildConfig.MTLS_P12_PASSWORD != null
                ? BuildConfig.MTLS_P12_PASSWORD.toCharArray()
                : new char[0];

            try (InputStream input = appContext.getAssets().open(assetPath)) {
                KeyStore keyStore = KeyStore.getInstance("PKCS12");
                keyStore.load(input, password);

                String alias = findPrivateKeyAlias(keyStore);
                if (alias == null) {
                    Log.e(TAG, "No private key entry found in PKCS#12 file.");
                    return false;
                }

                PrivateKey loadedPrivateKey = (PrivateKey) keyStore.getKey(alias, password);
                Certificate[] chain = keyStore.getCertificateChain(alias);
                if (loadedPrivateKey == null || chain == null || chain.length == 0) {
                    Log.e(TAG, "PKCS#12 missing private key or certificate chain.");
                    return false;
                }

                X509Certificate[] x509Chain = new X509Certificate[chain.length];
                for (int i = 0; i < chain.length; i++) {
                    if (!(chain[i] instanceof X509Certificate)) {
                        Log.e(TAG, "Non-X509 certificate found in chain.");
                        return false;
                    }
                    x509Chain[i] = (X509Certificate) chain[i];
                }

                privateKey = loadedPrivateKey;
                certChain = x509Chain;
                Log.i(TAG, "mTLS credentials loaded from assets/" + assetPath);
                return true;
            } catch (Exception ex) {
                Log.e(TAG, "Failed to load mTLS credentials.", ex);
                return false;
            } finally {
                Arrays.fill(password, '\0');
            }
        }
    }

    private String findPrivateKeyAlias(KeyStore keyStore) throws Exception {
        Enumeration<String> aliases = keyStore.aliases();
        while (aliases.hasMoreElements()) {
            String alias = aliases.nextElement();
            if (keyStore.isKeyEntry(alias)) {
                return alias;
            }
        }
        return null;
    }

    private Set<String> parseAllowedHosts(String rawHosts) {
        Set<String> hosts = new HashSet<>();
        if (rawHosts == null || rawHosts.trim().isEmpty()) {
            return hosts;
        }

        String[] parts = rawHosts.split(",");
        for (String part : parts) {
            String host = part.trim().toLowerCase(Locale.ROOT);
            if (!host.isEmpty()) {
                hosts.add(host);
            }
        }
        return hosts;
    }

    private boolean isAllowedHost(String host) {
        if (allowedHosts.isEmpty()) {
            return true;
        }
        if (host == null) {
            return false;
        }
        return allowedHosts.contains(host.toLowerCase(Locale.ROOT));
    }
}
