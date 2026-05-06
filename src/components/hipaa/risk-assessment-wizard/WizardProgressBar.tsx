import { cn } from "@/lib/utils";

type Props = {
  currentStep: 1 | 2 | 3 | 4 | 5;
};

export function WizardProgressBar({ currentStep }: Props): React.JSX.Element {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={currentStep}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i <= currentStep ? "bg-brand" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
