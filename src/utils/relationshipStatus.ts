import type { RelationshipStatus } from "../api/connections.api";

export function relationshipLabel(status: RelationshipStatus): string | null {
  switch (status) {
    case "connected":
      return "Connected";
    case "pending_sent":
      return "Request sent";
    case "pending_received":
      return "Request received";
    case "rejected":
      return "Declined";
    default:
      return null;
  }
}
