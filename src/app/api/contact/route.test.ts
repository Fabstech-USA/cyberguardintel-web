import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ id: "email_1" });
  });

  it("rejects invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      })
    );
    expect(res.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects a missing name", async () => {
    const res = await POST(
      request({ email: "a@example.com", message: "Hello there, this is a test." })
    );
    expect(res.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await POST(
      request({
        name: "Jane Doe",
        email: "not-an-email",
        message: "Hello there, this is a test.",
      })
    );
    expect(res.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects a too-short message", async () => {
    const res = await POST(
      request({ name: "Jane Doe", email: "a@example.com", message: "hi" })
    );
    expect(res.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("silently accepts without emailing when the honeypot is filled", async () => {
    const res = await POST(
      request({
        name: "Bot",
        email: "bot@example.com",
        message: "Automated submission from a scraper.",
        company_website: "https://spam.example",
      })
    );
    expect(res.status).toBe(200);
    const bodyOk = (await res.json()) as { ok?: boolean };
    expect(bodyOk.ok).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends an email with reply-to set to the submitter for a valid submission", async () => {
    const res = await POST(
      request({
        name: "Jane Doe",
        email: "jane@example.com",
        organization: "Acme Clinic",
        topic: "security",
        message: "What controls do you support for HIPAA audits?",
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.replyTo).toBe("jane@example.com");
    expect(call.subject).toContain("Security & compliance");
    expect(call.subject).toContain("Jane Doe");
    expect(call.html).toContain("Acme Clinic");
    expect(call.html).toContain("What controls do you support for HIPAA audits?");
  });

  it("defaults to the general topic when omitted", async () => {
    await POST(
      request({
        name: "Jane Doe",
        email: "jane@example.com",
        message: "Just saying hello, no specific topic here today.",
      })
    );
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.subject).toContain("General question");
  });

  it("escapes HTML in submitted fields", async () => {
    await POST(
      request({
        name: "<script>alert(1)</script>",
        email: "jane@example.com",
        message: "Message with <b>markup</b> that should be escaped.",
      })
    );
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("returns 502 when the email provider fails", async () => {
    sendEmailMock.mockRejectedValueOnce(new Error("Resend down"));
    const res = await POST(
      request({
        name: "Jane Doe",
        email: "jane@example.com",
        message: "Testing the failure path for the contact form route.",
      })
    );
    expect(res.status).toBe(502);
  });
});
