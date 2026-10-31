import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "lucide-react";
import { KpiTile } from "@/components/kpi-tile.skeleton";
import { StatusBadge } from "@/components/status-badge.skeleton";
import { CalendarEventChip } from "@/components/calendar-event-chip.skeleton";

describe("KpiTile", () => {
  it("renders label and pre-formatted value", () => {
    render(<KpiTile label="Occupancy" value="78%" />);
    expect(screen.getByText("Occupancy")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("renders the loading skeleton instead of a button", () => {
    const { container } = render(<KpiTile label="Revenue" value="$0" loading />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("fires onClick deep-link when activated", async () => {
    const onClick = vi.fn();
    render(<KpiTile label="Tasks" value="3" onClick={onClick} icon={Home} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows a trend line with direction text", () => {
    render(<KpiTile label="Revenue" value="$4,250" trend={{ direction: "up", text: "+12%" }} />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("maps a booking status to its human label", () => {
    render(<StatusBadge domain="booking" status="confirmed" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("maps a task status to its human label", () => {
    render(<StatusBadge domain="task" status="in_progress" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("maps an email delivery status to its human label", () => {
    render(<StatusBadge domain="email" status="bounced" />);
    expect(screen.getByText("Bounced")).toBeInTheDocument();
  });

  it("conveys status with more than color alone (dot + text, a11y)", () => {
    const { container } = render(<StatusBadge domain="task" status="done" />);
    // text label present
    expect(screen.getByText("Done")).toBeInTheDocument();
    // decorative dot present
    expect(container.querySelector("span.rounded-full")).toBeInTheDocument();
  });
});

describe("CalendarEventChip", () => {
  it("labels an Airbnb reservation for screen readers", () => {
    render(<CalendarEventChip label="HMABCDE123" source="airbnb" />);
    expect(screen.getByLabelText("Airbnb reservation: HMABCDE123")).toBeInTheDocument();
  });

  it("labels a manual block for screen readers", () => {
    render(<CalendarEventChip label="Maintenance" source="manual" />);
    expect(screen.getByLabelText("Manual block: Maintenance")).toBeInTheDocument();
  });

  it("fires onClick when selected", async () => {
    const onClick = vi.fn();
    render(<CalendarEventChip label="Stay" source="airbnb" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders the visible label text", () => {
    render(<CalendarEventChip label="Smith party" source="airbnb" continuation="start" />);
    expect(screen.getByText("Smith party")).toBeInTheDocument();
  });
});
