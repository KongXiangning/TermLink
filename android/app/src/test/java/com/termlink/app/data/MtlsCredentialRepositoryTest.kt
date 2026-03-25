package com.termlink.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Before
import org.junit.Test
import java.security.PrivateKey
import javax.net.ssl.SSLSocketFactory

class MtlsCredentialRepositoryTest {

    @Before
    fun setUp() {
        MtlsCredentialRepository.clear("profile-cache")
        MtlsCredentialRepository.clear("profile-failure")
    }

    @Test
    fun cacheKeyUsesProfileTimestampAndPasswordFingerprint() {
        var loadCount = 0
        val firstCredentials = fakeCredentials("first")
        val secondCredentials = fakeCredentials("second")
        val thirdCredentials = fakeCredentials("third")

        val first = MtlsCredentialRepository.load("profile-cache", 100L, "secret") {
            loadCount++
            firstCredentials
        }
        val second = MtlsCredentialRepository.load("profile-cache", 100L, "secret") {
            loadCount++
            secondCredentials
        }
        val changedTimestamp = MtlsCredentialRepository.load("profile-cache", 101L, "secret") {
            loadCount++
            secondCredentials
        }
        val changedPassword = MtlsCredentialRepository.load("profile-cache", 101L, "secret-2") {
            loadCount++
            thirdCredentials
        }

        assertSame(firstCredentials, first)
        assertSame(first, second)
        assertSame(secondCredentials, changedTimestamp)
        assertSame(thirdCredentials, changedPassword)
        assertEquals(3, loadCount)
    }

    @Test
    fun clearDropsCachedCredentialsForProfile() {
        var loadCount = 0
        val firstCredentials = fakeCredentials("clear-first")
        val secondCredentials = fakeCredentials("clear-second")

        val first = MtlsCredentialRepository.load("profile-cache", 200L, "secret") {
            loadCount++
            firstCredentials
        }
        MtlsCredentialRepository.clear("profile-cache")
        val second = MtlsCredentialRepository.load("profile-cache", 200L, "secret") {
            loadCount++
            secondCredentials
        }

        assertSame(firstCredentials, first)
        assertSame(secondCredentials, second)
        assertEquals(2, loadCount)
    }

    @Test
    fun failedLoadIsNotCached() {
        var loadCount = 0

        val first = MtlsCredentialRepository.load("profile-failure", 300L, "secret") {
            loadCount++
            null
        }
        val second = MtlsCredentialRepository.load("profile-failure", 300L, "secret") {
            loadCount++
            null
        }

        assertNull(first)
        assertNull(second)
        assertEquals(2, loadCount)
    }

    @Test
    fun exceptionDuringLoadReturnsNullAndIsNotCached() {
        var loadCount = 0

        val first = MtlsCredentialRepository.load("profile-failure", 301L, "secret") {
            loadCount++
            throw IllegalStateException("bad pkcs12")
        }
        val second = MtlsCredentialRepository.load("profile-failure", 301L, "secret") {
            loadCount++
            throw IllegalStateException("bad pkcs12")
        }

        assertNull(first)
        assertNull(second)
        assertEquals(2, loadCount)
    }

    private fun fakeCredentials(label: String): MtlsCredentials {
        return MtlsCredentials(
            privateKey = FakePrivateKey(label),
            certChain = emptyArray(),
            sslSocketFactory = SSLSocketFactory.getDefault() as SSLSocketFactory
        )
    }

    private class FakePrivateKey(private val label: String) : PrivateKey {
        override fun getAlgorithm(): String = "RSA"
        override fun getFormat(): String = "PKCS#8"
        override fun getEncoded(): ByteArray = label.toByteArray(Charsets.UTF_8)
    }
}
