import { renameForMechanism } from "@/lib/mechanism-name";

describe("renameForMechanism", () => {
  it("follows the new type when the name is only the old one", () => {
    expect(renameForMechanism("ElevatorSubsystem", "Elevator", "Arm", "v2")).toBe("ArmSubsystem");
    expect(renameForMechanism("ElevatorMechanism", "Elevator", "Flywheel", "v3")).toBe("FlywheelMechanism");
  });

  it("uses the suffix for the command framework, adding it or fixing it", () => {
    expect(renameForMechanism("ElevatorSubsystem", "Elevator", "Arm", "v3")).toBe("ArmMechanism");
    expect(renameForMechanism("ElevatorMechanism", "Elevator", "Elevator", "v2")).toBe("ElevatorSubsystem");
    expect(renameForMechanism("ElevatorSubsystem", "Elevator", "Elevator", "v3")).toBe("ElevatorMechanism");
    expect(renameForMechanism("Pivot", "Pivot", "Pivot", "v2")).toBe("PivotSubsystem");
    expect(renameForMechanism("Pivot", "Pivot", "Elevator", "v3")).toBe("ElevatorMechanism");
  });

  it("keeps a name the user chose", () => {
    expect(renameForMechanism("ClimberSubsystem", "Elevator", "Arm", "v3")).toBe("ClimberSubsystem");
    expect(renameForMechanism("ElevatorSubsystem2", "Elevator", "Arm", "v2")).toBe("ElevatorSubsystem2");
    expect(renameForMechanism("WristSubsystem", "Pivot", "Arm", "v2")).toBe("WristSubsystem");
    // The name of a different type than the one being changed from is the user's choice too.
    expect(renameForMechanism("ArmSubsystem", "Elevator", "Pivot", "v2")).toBe("ArmSubsystem");
  });
});
