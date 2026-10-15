"use client"

import type React from "react"
import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  ABSOLUTE_ENCODERS,
  SMART_IO_CHANNELS,
  absoluteEncoderIssues,
  attachesToMotorController,
  crtUniqueRange,
  encoderConnection,
  fitsDataPort,
  gcd,
  isTalon,
  travelDegrees,
} from "@/lib/absolute-encoder"
import { getMotorController } from "@/lib/config/hardware-config"
import type { AbsoluteEncoderType, FormValues } from "@/lib/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Form = UseFormReturn<any>

/** Store a number input's value, or "" while it is empty. */
function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>, onChange: (...event: unknown[]) => void) {
  const value = e.target.value
  if (value === "") {
    onChange("")
  } else {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) onChange(numValue)
  }
}

/** A problem with the inputs, shown under the field it belongs to. */
function Issue({ message }: { message?: string }) {
  return message ? <p className="text-sm font-medium text-destructive">{message}</p> : null
}

/** A labelled number input. */
function NumberField({
  form,
  name,
  label,
  step = "1",
  description,
  issue,
}: {
  form: Form
  name: string
  label: string
  step?: string
  description?: React.ReactNode
  issue?: string
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              {...field}
              value={field.value ?? ""}
              onChange={(e) => handleNumberChange(e, field.onChange)}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <Issue message={issue} />
        </FormItem>
      )}
    />
  )
}

/** A labelled switch. */
function SwitchField({ form, name, label, description }: { form: Form; name: string; label: string; description: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

/** The SystemCore's CAN buses. */
const CAN_BUSES = [0, 1, 2, 3, 4]

/** Which SystemCore CAN bus a device is on. */
export function CanBusField({ form, name, issue }: { form: Form; name: string; issue?: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>CAN Bus</FormLabel>
          <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? 0)}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {CAN_BUSES.map((bus) => (
                <SelectItem key={bus} value={String(bus)}>
                  CAN_S{bus}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Issue message={issue} />
        </FormItem>
      )}
    />
  )
}

/** The CAN ID or Smart IO channel an encoder is on. */
function ConnectionField({
  form,
  prefix,
  connection,
  issues,
}: {
  form: Form
  prefix: string
  connection: "can" | "candi" | "dataPort" | "smartIo"
  issues: (path: string) => string | undefined
}) {
  if (connection === "can" || connection === "candi") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          form={form}
          name={`${prefix}.canId`}
          label={connection === "can" ? "CANcoder CAN ID" : "CANdi CAN ID"}
          description={connection === "candi" ? "The encoder plugs into the CANdi's PWM1 input." : undefined}
          issue={issues(`${prefix}.canId`)}
        />
        <CanBusField form={form} name={`${prefix}.canBus`} issue={issues(`${prefix}.canBus`)} />
      </div>
    )
  }
  if (connection === "smartIo") {
    return (
      <NumberField
        form={form}
        name={`${prefix}.channel`}
        label="Smart IO Channel"
        description={`The SystemCore Smart IO port it is plugged into, 0 to ${SMART_IO_CHANNELS - 1}.`}
        issue={issues(`${prefix}.channel`)}
      />
    )
  }
  return null
}

/** Look up the issue for a field, by its dotted path. */
function issueLookup(values: FormValues) {
  const issues = absoluteEncoderIssues(values)
  return (path: string) => issues.find((issue) => issue.path.join(".") === path)?.message
}

/** One absolute encoder for an arm, pivot or turret. */
export function AbsoluteEncoderSection({ form }: { form: Form }) {
  const values = form.watch() as FormValues
  const issues = issueLookup(values)
  const controller = values.motorControllerType
  const controllerName = getMotorController(controller).displayName
  const type = values.absoluteEncoder?.type ?? "none"
  const noun = values.mechanismType.toLowerCase()
  const connection = type === "none" ? undefined : encoderConnection(type, values.absoluteEncoder?.port, controller)
  const yams = values.outputType === "yams"
  const travel = travelDegrees(values)

  return (
    <AccordionItem value="absoluteEncoder">
      <AccordionTrigger>Absolute Encoder</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An absolute encoder knows where the {noun} is when the robot turns on, so it does not have to start in the
            same place every match.
          </p>
          <FormField
            control={form.control}
            name="absoluteEncoder.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Encoder</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an encoder" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(Object.keys(ABSOLUTE_ENCODERS) as AbsoluteEncoderType[]).map((key) => (
                      <SelectItem
                        key={key}
                        value={key}
                        disabled={key === "Thrifty10Pin" && !fitsDataPort(key, controller)}
                      >
                        {ABSOLUTE_ENCODERS[key].displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {type !== "none" && <FormDescription>{ABSOLUTE_ENCODERS[type].description}</FormDescription>}
                <Issue message={issues("absoluteEncoder.type")} />
              </FormItem>
            )}
          />

          {((type === "ThroughBore" && fitsDataPort("ThroughBore", controller)) ||
            ((type === "ThroughBore" || type === "DutyCycle") && isTalon(controller))) && (
            <FormField
              control={form.control}
              name="absoluteEncoder.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plugged Into</FormLabel>
                  <Select onValueChange={field.onChange} value={connection}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fitsDataPort("ThroughBore", controller) && (
                        <SelectItem value="dataPort">The {controllerName}&apos;s data port</SelectItem>
                      )}
                      {isTalon(controller) && <SelectItem value="candi">A CANdi&apos;s PWM1 input</SelectItem>}
                      <SelectItem value="smartIo">A SystemCore Smart IO port</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}

          {connection && (
            <>
              <ConnectionField form={form} prefix="absoluteEncoder" connection={connection} issues={issues} />
              <NumberField
                form={form}
                name="absoluteEncoder.offset"
                label="Zero Offset (degrees)"
                step="0.01"
                description={`Move the ${noun} to 0°, and enter what the encoder reads.`}
              />
              <SwitchField
                form={form}
                name="absoluteEncoder.inverted"
                label="Inverted"
                description={`On when the encoder reading goes down as the ${noun} moves in its positive direction.`}
              />
              <NumberField
                form={form}
                name="absoluteEncoder.ratio"
                label="Encoder Gearing"
                step="0.01"
                description={`Encoder rotations per ${noun} rotation, 1 when it is on the ${noun}'s shaft. The travel between the hard stops (${travel.max - travel.min}°) times this must stay under one encoder turn.`}
                issue={issues("absoluteEncoder.ratio")}
              />
              <p className="text-sm text-muted-foreground">
                {!yams
                  ? `The code reads the encoder when the robot turns on, and starts the ${controllerName}'s encoder there.`
                  : attachesToMotorController(connection, controller)
                    ? `The ${controllerName} reads this encoder itself, so YAMS gives it to the SmartMotorController with withExternalEncoder.`
                    : `This encoder is not one the ${controllerName} reads itself, so the code reads it when the robot turns on and gives the angle to setEncoderPosition.`}
              </p>
              <p className="text-sm text-muted-foreground">
                {yams && attachesToMotorController(connection, controller)
                  ? `YAMS publishes the encoder as ${values.subsystemName}Motor/externalencoder/position. With the zero offset at 0, move the ${noun} to 0° and use that as the offset. If it goes the opposite way to the motor's position, turn on Inverted.`
                  : `The code logs the encoder's reading as AbsoluteEncoder/Reading and the angle it gives as AbsoluteEncoder/Angle. Move the ${noun} to 0° and use the reading as the offset. If the angle goes the opposite way to the ${noun}'s angle, turn on Inverted.`}
              </p>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

/** One of the two CRT encoders. */
function CrtEncoderFields({ form, which, values }: { form: Form; which: "encoderA" | "encoderB"; values: FormValues }) {
  const prefix = `turretParams.${which}`
  const issues = issueLookup(values)
  const encoder = values.turretParams?.[which] ?? {}
  const connection = encoderConnection(encoder.type ?? "CANcoder", "smartIo", values.motorControllerType)
  return (
    <div className="space-y-4 rounded-lg border p-3">
      <p className="text-sm font-medium">Encoder {which === "encoderA" ? "A" : "B"}</p>
      <FormField
        control={form.control}
        name={`${prefix}.type`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Encoder</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? "CANcoder"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="CANcoder">{ABSOLUTE_ENCODERS.CANcoder.displayName}</SelectItem>
                <SelectItem value="ThroughBore">{ABSOLUTE_ENCODERS.ThroughBore.displayName} (Smart IO)</SelectItem>
                <SelectItem value="DutyCycle">{ABSOLUTE_ENCODERS.DutyCycle.displayName}</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <ConnectionField form={form} prefix={prefix} connection={connection} issues={issues} />
      <NumberField
        form={form}
        name={`${prefix}.pinionTeeth`}
        label="Pinion Teeth"
        description="Teeth on the gear this encoder is on."
        issue={issues(`${prefix}.pinionTeeth`)}
      />
      <NumberField
        form={form}
        name={`${prefix}.offset`}
        label="Zero Offset (degrees)"
        step="0.01"
        description="What the encoder reads with the turret at 0°."
      />
      <SwitchField
        form={form}
        name={`${prefix}.inverted`}
        label="Inverted"
        description="On when the reading goes down as the turret turns positive. Usually on, since a pinion turns opposite to its gear."
      />
    </div>
  )
}

/** A turret's CRT: two encoders whose pinions have coprime tooth counts. */
export function TurretCrtSection({ form }: { form: Form }) {
  const values = form.watch() as FormValues
  const issues = issueLookup(values)
  const params = values.turretParams ?? {}
  const crt = params.crt ?? false
  const yams = values.outputType === "yams"
  const a = params.encoderA?.pinionTeeth
  const b = params.encoderB?.pinionTeeth
  const shared = params.sharedGearTeeth
  const travel = travelDegrees(values)
  const ready = Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(shared) && a! > 0 && b! > 0 && shared! > 0
  const range = ready ? crtUniqueRange(shared!, a!, b!) : 0
  const turretRange = ready ? (range / (params.sharedGearRatio || 1)) * 360 : 0

  return (
    <AccordionItem value="turretCrt">
      <AccordionTrigger>Turret Encoders (CRT)</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <SwitchField
            form={form}
            name="turretParams.crt"
            label="Two Encoders (CRT)"
            description="Find the turret's angle when the robot turns on from two absolute encoders on pinions with different tooth counts. Neither knows the angle on its own, but together they do, even over more than one turn."
          />
          {crt && (
            <>
              <p className="text-sm text-muted-foreground">
                {yams
                  ? "The code solves for the angle with YAMS's EasyCRT."
                  : "The code solves for the angle with the Chinese Remainder Theorem, adapted from FRC Team 8114's 2026 turret."}{" "}
                Both pinions mesh with one shared gear. Their tooth counts must be coprime (no common factor), or the
                readings repeat sooner.
              </p>
              <p className="text-sm text-muted-foreground">
                The code logs each encoder&apos;s reading as CRT/EncoderA and CRT/EncoderB, and the angle they agree on
                as CRT/Angle. With the turret at 0°, the readings are the offsets. CRT/Angle should follow the
                turret while it is still. If it does not, check that both readings go up as the turret turns positive.
              </p>
              <NumberField
                form={form}
                name="turretParams.sharedGearTeeth"
                label="Shared Gear Teeth"
                description="Teeth on the gear both encoder pinions mesh with."
                issue={issues("turretParams.sharedGearTeeth")}
              />
              <NumberField
                form={form}
                name="turretParams.sharedGearRatio"
                label="Shared Gear Rotations per Turret Rotation"
                step="0.01"
                description="1 when the pinions mesh with the turret gear itself."
                issue={issues("turretParams.sharedGearRatio")}
              />
              <div className="space-y-4">
                <CrtEncoderFields form={form} which="encoderA" values={values} />
                <CrtEncoderFields form={form} which="encoderB" values={values} />
              </div>
              {ready && a !== b && gcd(a!, b!) === 1 && (
                <p className="text-sm text-muted-foreground">
                  {a} and {b} teeth are coprime. Together they tell {turretRange.toFixed(0)}° of turret travel apart, and
                  the hard limits need {travel.max - travel.min}°.
                </p>
              )}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
