"use client"

import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { SMART_IO_CHANNELS } from "@/lib/absolute-encoder"
import { homingIssues, homingNotes, type HomingEnd } from "@/lib/homing"
import type { FormValues } from "@/lib/types"
import { Issue, NumberField, SwitchField } from "./absolute-encoder-form"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Form = UseFormReturn<any>

/** One homing switch: whether it is there, its Smart IO channel, and what it reads when pressed. */
function HomingSwitchFields({
  form,
  end,
  bound,
  issues,
  note,
}: {
  form: Form
  end: HomingEnd
  bound: string
  issues: (path: string) => string | undefined
  note?: string
}) {
  const enabled = form.watch(`homing.${end}.enabled`) ?? false
  const label = end === "lower" ? "Lower Switch" : "Upper Switch"
  return (
    <div className="space-y-4">
      <SwitchField
        form={form}
        name={`homing.${end}.enabled`}
        label={label}
        description={`At the ${end} hard limit. Pressing it sets the position to ${bound}.`}
      />
      {enabled && (
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            form={form}
            name={`homing.${end}.channel`}
            label="Smart IO Channel"
            description={`The SystemCore Smart IO port, 0 to ${SMART_IO_CHANNELS - 1}`}
            issue={issues(`homing.${end}.channel`)}
          />
          <FormField
            control={form.control}
            name={`homing.${end}.pressedReads`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pressed Reads</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? "high"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">High (true)</SelectItem>
                    <SelectItem value="low">Low (false)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  A normally open switch between the signal and power (3.3 V) pins reads high when pressed
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
      )}
      {enabled && note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}

/**
 * The switch that turns homing on. Turning it on first warns that the switches can bend or move,
 * so homing can set the wrong position, and only turns it on once that is acknowledged.
 */
function UseHomingField({ form, noun }: { form: Form; noun: string }) {
  const [warning, setWarning] = useState(false)
  return (
    <>
      <FormField
        control={form.control}
        name="homing.enabled"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>Use Homing Switches</FormLabel>
              <FormDescription>Digital inputs on SystemCore Smart IO ports that reset the position at a hard limit</FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={(checked) => (checked ? setWarning(true) : field.onChange(false))}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <AlertDialog open={warning} onOpenChange={setWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check homing switches regularly</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  The {noun} hits its limit switches at the hard stops, which can bend them, shift their mounts or wear
                  their levers. A switch that moves presses at a different position, so homing sets the encoder to the
                  wrong position, and the {noun} is then off by that much until it homes again.
                </p>
                <p>
                  Check the switches regularly, such as in pit checks: that they are tight and straight, and that the{" "}
                  {noun} reads the hard limit when it presses each one.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => form.setValue("homing.enabled", true, { shouldDirty: true })}>
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Homing switches at the ends of an arm's, elevator's, pivot's or turret's travel. */
export function HomingSection({ form }: { form: Form }) {
  const values = form.watch() as FormValues
  const found = homingIssues(values)
  const issues = (path: string) => found.find((issue) => issue.path.join(".") === path)?.message
  const notes = homingNotes(values)
  const noun = values.mechanismType.toLowerCase()
  const enabled = values.homing?.enabled ?? false
  const elevator = values.mechanismType === "Elevator"
  const bound = (value: number | undefined, fallback: number) => `${value ?? fallback}${elevator ? " m" : "°"}`
  const limits = elevator ? values.elevatorParams : values.armParams
  const yams = values.outputType === "yams"

  return (
    <AccordionItem value="homing">
      <AccordionTrigger>Homing</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Limit switches at the ends of the travel tell the {noun} where it is. When the {noun} presses one, the
            motor&apos;s encoder is set to that end, so a slipped belt or a robot turned on away from its starting
            position is corrected there.
            {yams
              ? " Each switch is a digital input wrapped in a YAMS Sensor, which the simulation presses at the hard stop, as the real one is pressed."
              : " The simulation presses each switch at the hard stop, as the real one is pressed."}
          </p>
          <UseHomingField form={form} noun={noun} />
          <Issue message={issues("homing.enabled")} />
          {enabled && (
            <>
              <HomingSwitchFields
                form={form}
                end="lower"
                bound={bound(limits?.hardLimitMin, 0)}
                issues={issues}
                note={notes.find((note) => note.end === "lower")?.message}
              />
              <HomingSwitchFields
                form={form}
                end="upper"
                bound={bound(limits?.hardLimitMax, elevator ? 1 : 90)}
                issues={issues}
                note={notes.find((note) => note.end === "upper")?.message}
              />
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
