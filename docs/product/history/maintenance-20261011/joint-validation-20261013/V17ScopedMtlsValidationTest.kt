package com.termlink.app.mtls

import android.net.Uri
import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.termlink.app.data.*
import com.termlink.app.web.MtlsWebViewClient
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import java.io.File
import java.net.URL
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.net.ssl.HttpsURLConnection

/** Real protected service. Only unique test certificate IDs are touched; existing profiles remain intact. */
@RunWith(AndroidJUnit4::class)
class V17ScopedMtlsValidationTest {
 @Test fun restoreOriginalActiveProfile() {
  val context=ApplicationProvider.getApplicationContext<android.content.Context>()
  val store=ServerConfigStore(context)
  val state=store.loadState()
  val original=state.profiles.single { it.name=="Task005 S2 Local" }
  assertFalse(state.profiles.any { it.name=="V17-MTLS-UI" })
  store.setActiveProfile(original.id)
  assertEquals(original.id,store.loadState().activeProfileId)
 }
 @Test fun nativeAndWebViewUseProfileCertificateWithScopedCleanup() {
  val context=ApplicationProvider.getApplicationContext<android.content.Context>()
  val store=MtlsCertificateStore(context)
  val id="v17-scoped-mtls-"+UUID.randomUUID()
  val file=File(context.cacheDir,"$id.p12")
  val profile=ServerProfile(id=id,name="V17 isolated mTLS",baseUrl="https://client.badssl.com",terminalType=TerminalType.EXTERNAL_WEB,authType=AuthType.NONE,basicUsername="",mtlsEnabled=true,allowedHosts="client.badssl.com",mtlsCertificateDisplayName="V17-client.p12")
  var webView:WebView?=null
  try {
   file.writeBytes(android.util.Base64.decode(MtlsValidationFixtures.BADSSL_CLIENT_P12_BASE64,android.util.Base64.DEFAULT))
   assertTrue(store.importCertificate(id,Uri.fromFile(file)))
   store.putPassword(id,"wrong-test-password")
   assertNull(MtlsCredentialRepository.load(profile,store))
   store.putPassword(id,MtlsValidationFixtures.BADSSL_PASSWORD)
   assertNotNull(MtlsCredentialRepository.load(profile,store))
   val connection=URL(profile.baseUrl).openConnection() as HttpsURLConnection
   connection.connectTimeout=15000;connection.readTimeout=15000
   assertTrue(MtlsHttpSupport(context).applyIfNeeded(connection,profile) is ApiResult.Success)
   assertEquals(200,connection.responseCode)
   println("V17_MTLS native GET 200 with current profile certificate")
   connection.disconnect()
   val done=CountDownLatch(1)
   var failure:String?=null
   var sawClientCertificate=false
   val activityIntent=android.content.Intent().setClassName("com.termlink.app","com.termlink.app.SettingsActivity")
   val scenario=ActivityScenario.launch<com.termlink.app.SettingsActivity>(activityIntent)
   scenario.onActivity { activity ->
    webView=WebView(activity).apply {
     settings.javaScriptEnabled=true
     webViewClient=object:MtlsWebViewClient(activity,profileProvider={profile}) {
      override fun onReceivedClientCertRequest(view:WebView,request:android.webkit.ClientCertRequest) { sawClientCertificate=true;super.onReceivedClientCertRequest(view,request) }
      override fun onReceivedError(view:WebView,request:android.webkit.WebResourceRequest,error:android.webkit.WebResourceError) { if(request.isForMainFrame){failure=error.description.toString();done.countDown()} }
      override fun onReceivedHttpError(view:WebView,request:android.webkit.WebResourceRequest,response:android.webkit.WebResourceResponse) { if(request.isForMainFrame){failure="HTTP "+response.statusCode;done.countDown()} }
      override fun onPageFinished(view:WebView?,url:String?) {
       super.onPageFinished(view,url)
       if(url?.startsWith(profile.baseUrl)==true) {
        view?.evaluateJavascript("document.body.innerText") { body ->
         println("V17_MTLS web body: "+body)
         if(body.contains("badssl.com") && body.contains("This site requires"))done.countDown()
        }
       }
      }
     }
     activity.setContentView(this)
     loadUrl(profile.baseUrl)
    }
   }
   assertTrue("real WebView protected page did not load",done.await(25,TimeUnit.SECONDS))
   assertNull(failure)
   assertTrue("protected page did not request current profile certificate",sawClientCertificate)
   scenario.onActivity { webView?.destroy() };scenario.close()
   store.removeCertificate(id);store.removePassword(id);MtlsCredentialRepository.clear(id)
   assertFalse(store.hasCertificate(id))
   println("V17_MTLS scoped certificate/password/cache removed; other IDs untouched")
  } finally {
   store.removeCertificate(id);store.removePassword(id);MtlsCredentialRepository.clear(id);file.delete()
  }
 }
}





