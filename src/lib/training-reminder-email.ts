export type TrainingReminderEmailInput = {
  organizationName: string;
  employeeName: string;
  trainingTitle: string;
  nextDueAt: Date;
  mode: "scheduled" | "manual";
  reminderDay?: number;
  daysUntilDue: number;
};

function formatDueDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function wrapHtml(
  employeeName: string,
  orgName: string,
  bodyLine: string,
  cta: string
): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Annual HIPAA training reminder</h2>
      <p>Hi ${employeeName},</p>
      <p>${orgName} records show ${bodyLine}</p>
      <p>${cta}</p>
    </div>
  `;
}

export function buildTrainingReminderEmail(
  input: TrainingReminderEmailInput
): { subject: string; html: string } {
  const orgName = input.organizationName;
  const topic = input.trainingTitle;
  const dueOn = formatDueDate(input.nextDueAt);
  const cta =
    "Please complete the required module before the annual deadline per 45 CFR 164.308(a)(5).";
  const overdueCta =
    "Complete renewal training as soon as possible per 45 CFR 164.308(a)(5).";

  if (input.mode === "scheduled" && input.reminderDay !== undefined) {
    const day = input.reminderDay;
    const subject =
      day === 0
        ? `HIPAA training due today: ${topic}`
        : `HIPAA training due in ${day} days: ${topic}`;
    const timing =
      day === 0
        ? "is due for renewal today"
        : `is due for renewal in ${day} days (${dueOn})`;

    return {
      subject,
      html: wrapHtml(
        input.employeeName,
        orgName,
        `your <strong>${topic}</strong> training ${timing}.`,
        day === 0 ? overdueCta.replace("as soon as possible", "today") : cta
      ),
    };
  }

  if (input.daysUntilDue < 0) {
    return {
      subject: `HIPAA training OVERDUE: ${topic}`,
      html: wrapHtml(
        input.employeeName,
        orgName,
        `your <strong>${topic}</strong> training is <strong>overdue</strong> (was due ${dueOn}).`,
        overdueCta
      ),
    };
  }

  if (input.daysUntilDue === 0) {
    return {
      subject: `HIPAA training due today: ${topic}`,
      html: wrapHtml(
        input.employeeName,
        orgName,
        `your <strong>${topic}</strong> training is due for renewal <strong>today</strong> (${dueOn}).`,
        cta.replace("before the annual deadline", "today")
      ),
    };
  }

  return {
    subject: `HIPAA training due soon: ${topic}`,
    html: wrapHtml(
      input.employeeName,
      orgName,
      `your <strong>${topic}</strong> training is due for renewal in ${input.daysUntilDue} days (${dueOn}).`,
      cta
    ),
  };
}
