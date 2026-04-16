import { describe, expect, it } from "vitest";
import { encryptCredentials, decryptCredentials, hashEvidence } from "./crypto";

describe("crypto", () => {
  describe("encryptCredentials / decryptCredentials", () => {
    it("round-trips plaintext through encrypt then decrypt", () => {
      const secret = '{"accessKeyId":"AKIA...","secretAccessKey":"wJal..."}';
      const encrypted = encryptCredentials(secret);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toBe(secret);
    });

    it("produces format iv:tag:ciphertext (3 base64 segments)", () => {
      const encrypted = encryptCredentials("test");
      const parts = encrypted.split(":");

      expect(parts).toHaveLength(3);
      parts.forEach((part) => {
        expect(() => Buffer.from(part, "base64")).not.toThrow();
      });
    });

    it("produces different ciphertext for the same input (random IV)", () => {
      const a = encryptCredentials("same-input");
      const b = encryptCredentials("same-input");

      expect(a).not.toBe(b);
    });

    it("throws on tampered ciphertext", () => {
      const encrypted = encryptCredentials("sensitive");
      const [iv, tag, data] = encrypted.split(":");
      const tampered = `${iv}:${tag}:${Buffer.from("tampered").toString("base64")}`;

      expect(() => decryptCredentials(tampered)).toThrow();
    });

    it("handles empty string", () => {
      const encrypted = encryptCredentials("");
      expect(decryptCredentials(encrypted)).toBe("");
    });

    it("handles unicode content", () => {
      const unicode = "パスワード 🔐 contraseña";
      const encrypted = encryptCredentials(unicode);
      expect(decryptCredentials(encrypted)).toBe(unicode);
    });
  });

  describe("hashEvidence", () => {
    it("returns a 64-char hex SHA-256 digest", () => {
      const hash = hashEvidence(Buffer.from("test-file-content"));

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces consistent hashes for the same input", () => {
      const content = Buffer.from("compliance-evidence");
      expect(hashEvidence(content)).toBe(hashEvidence(content));
    });

    it("produces different hashes for different input", () => {
      const a = hashEvidence(Buffer.from("file-a"));
      const b = hashEvidence(Buffer.from("file-b"));

      expect(a).not.toBe(b);
    });
  });
});
