use std::{
    fs::File,
    io::{self, Read, Seek, SeekFrom},
    path::Path,
};

/// Stable, bounded digest used by source fingerprints and physical line
/// anchors.  The algorithm name is part of the persisted cursor contract.
pub(crate) const SHA256_ALGORITHM: &str = "sha256-v1";

pub(crate) fn digest_bytes(bytes: &[u8]) -> String {
    let mut digest = Sha256::new();
    digest.update(bytes);
    digest.finalize_hex()
}

pub(crate) fn digest_file_range(path: &Path, start: u64, end: u64) -> io::Result<String> {
    if start > end {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("invalid digest range {start}..{end}"),
        ));
    }

    let mut file = File::open(path)?;
    file.seek(SeekFrom::Start(start))?;
    let mut remaining = end - start;
    let mut buffer = [0_u8; 64 * 1024];
    let mut digest = Sha256::new();
    while remaining > 0 {
        let requested = remaining.min(buffer.len() as u64) as usize;
        let read = file.read(&mut buffer[..requested])?;
        if read == 0 {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                format!("source ended while hashing range {start}..{end}"),
            ));
        }
        digest.update(&buffer[..read]);
        remaining -= read as u64;
    }
    Ok(digest.finalize_hex())
}

/// Hash a file range while allowing the caller to enforce an external
/// resource budget before each physical read.  The callback is deliberately
/// invoked with the requested chunk size, so callers can reserve the read
/// against an aggregate byte budget before touching the file.
pub(crate) enum DigestFileRangeError<E> {
    Io(io::Error),
    Callback(E),
}

pub(crate) fn digest_file_range_with_callback<E, F>(
    path: &Path,
    start: u64,
    end: u64,
    mut before_read: F,
) -> Result<String, DigestFileRangeError<E>>
where
    F: FnMut(u64) -> Result<(), E>,
{
    if start > end {
        return Err(DigestFileRangeError::Io(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("invalid digest range {start}..{end}"),
        )));
    }

    let mut file = File::open(path).map_err(DigestFileRangeError::Io)?;
    file.seek(SeekFrom::Start(start))
        .map_err(DigestFileRangeError::Io)?;
    let mut remaining = end - start;
    let mut buffer = [0_u8; 64 * 1024];
    let mut digest = Sha256::new();
    while remaining > 0 {
        let requested = remaining.min(buffer.len() as u64);
        before_read(requested).map_err(DigestFileRangeError::Callback)?;
        let read = file
            .read(&mut buffer[..requested as usize])
            .map_err(DigestFileRangeError::Io)?;
        if read == 0 {
            return Err(DigestFileRangeError::Io(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                format!("source ended while hashing range {start}..{end}"),
            )));
        }
        digest.update(&buffer[..read]);
        remaining -= read as u64;
    }
    Ok(digest.finalize_hex())
}

/// Small dependency-free SHA-256 implementation for source identity checks.
/// It is intentionally private to the source layer; callers persist only the
/// algorithm label and hexadecimal digest through SourceFingerprint.
struct Sha256 {
    state: [u32; 8],
    block: [u8; 64],
    block_len: usize,
    message_len: u64,
}

impl Sha256 {
    fn new() -> Self {
        Self {
            state: [
                0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
                0x5be0cd19,
            ],
            block: [0; 64],
            block_len: 0,
            message_len: 0,
        }
    }

    fn update(&mut self, mut bytes: &[u8]) {
        self.message_len = self.message_len.saturating_add(bytes.len() as u64);

        if self.block_len > 0 {
            let needed = 64 - self.block_len;
            if bytes.len() < needed {
                self.block[self.block_len..self.block_len + bytes.len()].copy_from_slice(bytes);
                self.block_len += bytes.len();
                return;
            }
            self.block[self.block_len..].copy_from_slice(&bytes[..needed]);
            self.compress(self.block);
            self.block_len = 0;
            bytes = &bytes[needed..];
        }

        while bytes.len() >= 64 {
            let mut block = [0_u8; 64];
            block.copy_from_slice(&bytes[..64]);
            self.compress(block);
            bytes = &bytes[64..];
        }

        if !bytes.is_empty() {
            self.block[..bytes.len()].copy_from_slice(bytes);
            self.block_len = bytes.len();
        }
    }

    fn finalize_hex(mut self) -> String {
        let bit_len = self.message_len.saturating_mul(8);
        self.block[self.block_len] = 0x80;
        self.block_len += 1;

        if self.block_len > 56 {
            self.block[self.block_len..].fill(0);
            self.compress(self.block);
            self.block = [0; 64];
            self.block_len = 0;
        }
        self.block[self.block_len..56].fill(0);
        self.block[56..].copy_from_slice(&bit_len.to_be_bytes());
        self.compress(self.block);

        let mut output = String::with_capacity(64);
        for word in self.state {
            output.push_str(&format!("{word:08x}"));
        }
        output
    }

    fn compress(&mut self, block: [u8; 64]) {
        const K: [u32; 64] = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
            0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
            0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
            0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
            0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
            0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
            0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
            0xc67178f2,
        ];

        let mut words = [0_u32; 64];
        for (index, chunk) in block.chunks_exact(4).take(16).enumerate() {
            words[index] = u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        }
        for index in 16..64 {
            let small_sigma0 = words[index - 15].rotate_right(7)
                ^ words[index - 15].rotate_right(18)
                ^ (words[index - 15] >> 3);
            let small_sigma1 = words[index - 2].rotate_right(17)
                ^ words[index - 2].rotate_right(19)
                ^ (words[index - 2] >> 10);
            words[index] = words[index - 16]
                .wrapping_add(small_sigma0)
                .wrapping_add(words[index - 7])
                .wrapping_add(small_sigma1);
        }

        let mut working = self.state;
        for index in 0..64 {
            let big_sigma1 = working[4].rotate_right(6)
                ^ working[4].rotate_right(11)
                ^ working[4].rotate_right(25);
            let choose = (working[4] & working[5]) ^ ((!working[4]) & working[6]);
            let temp1 = working[7]
                .wrapping_add(big_sigma1)
                .wrapping_add(choose)
                .wrapping_add(K[index])
                .wrapping_add(words[index]);
            let big_sigma0 = working[0].rotate_right(2)
                ^ working[0].rotate_right(13)
                ^ working[0].rotate_right(22);
            let majority =
                (working[0] & working[1]) ^ (working[0] & working[2]) ^ (working[1] & working[2]);
            let temp2 = big_sigma0.wrapping_add(majority);

            working[7] = working[6];
            working[6] = working[5];
            working[5] = working[4];
            working[4] = working[3].wrapping_add(temp1);
            working[3] = working[2];
            working[2] = working[1];
            working[1] = working[0];
            working[0] = temp1.wrapping_add(temp2);
        }

        for (state, value) in self.state.iter_mut().zip(working) {
            *state = state.wrapping_add(value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{SHA256_ALGORITHM, digest_bytes};

    #[test]
    fn sha256_is_stable_across_updates() {
        assert_eq!(SHA256_ALGORITHM, "sha256-v1");
        assert_eq!(
            digest_bytes(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );

        let mut bytes = Vec::new();
        for _ in 0..80 {
            bytes.extend_from_slice(b"stable-source-line\n");
        }
        assert_eq!(digest_bytes(&bytes), digest_bytes(&bytes));
    }
}
