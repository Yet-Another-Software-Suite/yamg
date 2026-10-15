import { DEFAULT_VALUES, VERSION_1_DEFAULT_VALUES, formSchema } from "@/components/useCodeGeneratorForm";
import { decodeForm, diffFromDefaults, encodeForm, mergeOntoDefaults, shareParam } from "@/lib/share-link";

describe("share links", () => {
  const changed = {
    ...DEFAULT_VALUES,
    subsystemName: "ArmMechanism",
    mechanismType: "Arm" as const,
    commandsVersion: "v3" as const,
    motorControllerType: "TalonFX" as const,
    motorType: "Krakenx60" as const,
    pidValues: { kP: 12.5, kI: 0, kD: 0.2 },
    armParams: { ...DEFAULT_VALUES.armParams, length: 0.6, hardLimitMax: 110 },
  };

  it("loads the same form it was made from", async () => {
    const encoded = await encodeForm(changed, DEFAULT_VALUES);
    const loaded = await decodeForm(encoded, DEFAULT_VALUES);
    expect(loaded).toEqual(changed);
    expect(formSchema.safeParse(loaded).success).toBe(true);
  });

  it("keeps only what differs from the defaults", () => {
    expect(diffFromDefaults(DEFAULT_VALUES, DEFAULT_VALUES)).toBeUndefined();
    expect(diffFromDefaults(changed, DEFAULT_VALUES)).toEqual({
      subsystemName: "ArmMechanism",
      mechanismType: "Arm",
      commandsVersion: "v3",
      motorControllerType: "TalonFX",
      motorType: "Krakenx60",
      pidValues: { kP: 12.5, kD: 0.2 },
      armParams: { length: 0.6, hardLimitMax: 110 },
    });
    expect(mergeOntoDefaults({}, DEFAULT_VALUES)).toEqual(DEFAULT_VALUES);
  });

  it("is short and safe in a URL", async () => {
    const encoded = await encodeForm(changed, DEFAULT_VALUES);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    // Eight changed fields: 212 characters of JSON become about 210 of link.
    expect(encoded.length).toBeLessThan(220);
    expect(await decodeForm(await encodeForm(DEFAULT_VALUES, DEFAULT_VALUES), DEFAULT_VALUES)).toEqual(DEFAULT_VALUES);
  });

  it("starts on a TalonFXS with a NEO", () => {
    expect(DEFAULT_VALUES.motorControllerType).toBe("TalonFXS");
    expect(DEFAULT_VALUES.motorType).toBe("NEO");
  });

  it("opens links made before the default changed on the SPARK MAX they were made with", async () => {
    // A version 1 link: the diff from the old defaults, with no version, as links used to be made.
    const versionOne = async (diff: object) => {
      const output = new Blob([new TextEncoder().encode(JSON.stringify(diff))]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      const bytes = new Uint8Array(await new Response(output).arrayBuffer());
      return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };
    // It left the motor controller out, so it was a SPARK MAX.
    const sparkMax = await decodeForm(await versionOne({ mechanismType: "Arm" }), DEFAULT_VALUES, VERSION_1_DEFAULT_VALUES);
    expect(sparkMax).toEqual({ ...VERSION_1_DEFAULT_VALUES, mechanismType: "Arm" });
    // One that chose a motor controller keeps it.
    const talon = await decodeForm(await versionOne({ motorControllerType: "TalonFX", motorType: "Krakenx60" }), DEFAULT_VALUES, VERSION_1_DEFAULT_VALUES);
    expect(talon).toMatchObject({ motorControllerType: "TalonFX", motorType: "Krakenx60" });
    // A new link that leaves it out is on the new default.
    const current = await decodeForm(await encodeForm({ ...DEFAULT_VALUES, mechanismType: "Arm" }, DEFAULT_VALUES), DEFAULT_VALUES, VERSION_1_DEFAULT_VALUES);
    expect(current).toEqual({ ...DEFAULT_VALUES, mechanismType: "Arm" });
  });

  it("reads the form from the URL hash", () => {
    expect(shareParam("#config=abc_-1")).toBe("abc_-1");
    expect(shareParam("")).toBeUndefined();
    expect(shareParam("#other=1")).toBeUndefined();
  });

  it("refuses text that is not a share link", async () => {
    await expect(decodeForm("not-a-link", DEFAULT_VALUES)).rejects.toThrow();
  });
});
