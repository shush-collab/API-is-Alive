import * as React from "react";
import { cn } from "../../lib/utils";

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("h-[260px] w-full", className)} {...props} />
));
ChartContainer.displayName = "ChartContainer";

export { ChartContainer };
