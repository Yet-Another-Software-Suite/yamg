"use client"

import type React from "react"
import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  MECHANISMS,
  MOTOR_CONTROLLERS,
  MOTORS,
  getCompatibleMotors,
  isMotorCompatibleWithController,
} from "@/lib/config/hardware-config"
import ReCalcIntegration from "./recalc-integration"
import { renameForMechanism } from "@/lib/mechanism-name"

export default function MechanismForm({ form }: { form: UseFormReturn<any> }) {
  const mechanismType = form.watch("mechanismType")
  const motorControllerType = form.watch("motorControllerType", "SparkMAX")
  const motorType = form.watch("motorType", "NEO")
  // YAMS publishes its own telemetry, so the Telemetry section is only for plain vendor code.
  const usesYams = form.watch("outputType") === "yams"
  const elevatorDriveType = form.watch("elevatorParams.driveType") ?? "drum"
  const elevatorCascade = form.watch("elevatorParams.cascade") ?? false

  // The units the generated code uses, which are also the units YAMS uses.
  const isElevator = mechanismType === "Elevator"
  const isFlywheel = mechanismType === "Flywheel"
  const pidUnit = isElevator ? "meter" : isFlywheel ? "rotation per second" : "rotation"
  const feedforwardUnit = isElevator ? "m" : mechanismType === "Arm" ? "rad" : "rot"

  // Get all available controllers and motors from the configuration
  const allControllers = Object.values(MOTOR_CONTROLLERS)
  const allMotors = Object.values(MOTORS)

  // Get compatible controllers and motors based on current selections
  const compatibleMotors = getCompatibleMotors(motorControllerType)

  // Handle motor controller change
  const handleMotorControllerChange = (value: string) => {
    form.setValue("motorControllerType", value)

    // If changing away from TalonFX and using a Kraken motor, switch to KrakenX60
    if (value !== "TalonFX" && !isMotorCompatibleWithController(motorType, value)) {
      form.setValue("motorType", "NEO")
    } else if (value === "TalonFX" && !isMotorCompatibleWithController(motorType, value)) {
      form.setValue("motorType", "Krakenx60")
    }
  }

  // When the mechanism type or the command framework changes, a name that was only the mechanism
  // type follows it, with the framework's suffix, and so does a NetworkTables key that matched it.
  const renameIfDefault = (from: string, to: string, commandsVersion: "v2" | "v3") => {
    const name = form.getValues("subsystemName")
    const renamed = renameForMechanism(name, from, to, commandsVersion)
    if (renamed !== name) {
      form.setValue("subsystemName", renamed)
      if (form.getValues("telemetry.ntKey") === name) {
        form.setValue("telemetry.ntKey", renamed)
      }
    }
  }

  const handleMechanismTypeChange = (value: string) => {
    renameIfDefault(form.getValues("mechanismType"), value, form.getValues("commandsVersion"))
    form.setValue("mechanismType", value)
  }

  const handleCommandsVersionChange = (value: "v2" | "v3") => {
    const mechanism = form.getValues("mechanismType")
    renameIfDefault(mechanism, mechanism, value)
    form.setValue("commandsVersion", value)
  }

  // Handle motor type change
  const handleMotorTypeChange = (value: string) => {
    form.setValue("motorType", value)
  }

  // Safe number input handler
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (...event: any[]) => void) => {
    const value = e.target.value
    if (value === "") {
      onChange("")
    } else {
      const numValue = Number.parseFloat(value)
      if (!isNaN(numValue)) {
        onChange(numValue)
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="subsystemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subsystem Name</FormLabel>
                  <FormControl>
                    <Input placeholder="MechanismSubsystem" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mechanismType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mechanism Type</FormLabel>
                  <Select onValueChange={handleMechanismTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mechanism type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(MECHANISMS).map((mechanism) => (
                        <SelectItem key={mechanism.name} value={mechanism.name}>
                          {mechanism.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outputType"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Use YAMS</FormLabel>
                    <FormDescription>
                      Generate code that uses the YAMS library, instead of code that only uses WPILib and the
                      motor controller&apos;s vendor library.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "yams"}
                      onCheckedChange={(checked) => field.onChange(checked ? "yams" : "vendor")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commandsVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Command Framework</FormLabel>
                  <Select onValueChange={handleCommandsVersionChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a command framework" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="v2">Commands v2 (a subsystem)</SelectItem>
                      <SelectItem value="v3">Commands v3 (a mechanism)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Match the WPILib 2027 template your project was made from. A Commands v3 mechanism needs its
                    periodic() and simulationPeriodic() called from Robot.java.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full" defaultValue="motorConfig">
        <AccordionItem value="motorConfig">
          <AccordionTrigger>Motor Configuration</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="motorControllerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor Controller Type</FormLabel>
                    <Select onValueChange={handleMotorControllerChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select motor controller" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allControllers.map((controller) => (
                          <SelectItem key={controller.name} value={controller.name}>
                            {controller.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor Type</FormLabel>
                    <Select onValueChange={handleMotorTypeChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select motor type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {compatibleMotors.map((motor) => (
                          <SelectItem key={motor.name} value={motor.name}>
                            {motor.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {!isMotorCompatibleWithController("NEO", motorControllerType)
                        ? "Kraken motors can only be used with TalonFX"
                        : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAN ID</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => handleNumberChange(e, field.onChange)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gearRatio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gear Ratio</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        {...field}
                        onChange={(e) => handleNumberChange(e, field.onChange)}
                      />
                    </FormControl>
                    <FormDescription>Motor rotations per mechanism rotation. (eg 9:1 is 9/1)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brakeMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Brake Mode</FormLabel>
                      <FormDescription>Enable brake mode (disable for coast)</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Ramp Rates (seconds)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rampRates.openLoop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open Loop Ramp Rate</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Time to reach full throttle (0 = disabled)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {motorControllerType !== "ThriftyNova" && (
                  <FormField
                    control={form.control}
                    name="rampRates.closedLoop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closed Loop Ramp Rate</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Time to reach full velocity (0 = disabled)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Limits</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currentLimits.stator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stator Current Limit (A)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="40"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {MOTOR_CONTROLLERS[motorControllerType].supportsSupplyCurrentLimit && (
                    <FormField
                      control={form.control}
                      name="currentLimits.supply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supply Current Limit (A)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="40"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>Only for TalonFX/TalonFXS</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="controlConfig">
          <AccordionTrigger>Control Configuration</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>PID Values (volts per {pidUnit} of error)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pidValues.kP"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kP</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pidValues.kI"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kI</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pidValues.kD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kD</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {!isFlywheel && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxVelocity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Velocity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>The fastest the closed loop moves the mechanism, in {isElevator ? "meters" : "radians"} per second</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxAcceleration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Acceleration</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>The fastest the closed loop accelerates the mechanism, in {isElevator ? "meters" : "radians"} per second²</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {!isFlywheel && (
              <div className="space-y-2">
                <Label>Soft Limits ({isElevator ? "meters" : "degrees"})</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="softLimits.forward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forward Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>The highest the closed loop will go. Set both limits to use them.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="softLimits.reverse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reverse Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>The lowest the closed loop will go. Set both limits to use them.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              )}

              <div className="space-y-2">
                <Label>Feedforward</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="feedforward.kS"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kS (Static Friction)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Volts to overcome friction</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="feedforward.kV"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kV (Velocity)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Velocity feedforward in V/({feedforwardUnit}/s){!isFlywheel && mechanismType !== "Pivot" ? " (auto-calculable with ReCalc)" : ""}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="feedforward.kA"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kA (Acceleration)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Acceleration feedforward in V/({feedforwardUnit}/s²){!isFlywheel && mechanismType !== "Pivot" ? " (auto-calculable with ReCalc)" : ""}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(mechanismType === "Elevator" || mechanismType === "Arm") && (
                    <FormField
                      control={form.control}
                      name="feedforward.kG"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>kG (Gravity)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>Gravity compensation in V (auto-calculable with ReCalc)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <ReCalcIntegration
                    formValues={form.getValues()}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {!usesYams && (
        <AccordionItem value="telemetry">
          <AccordionTrigger>Telemetry</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="telemetry.logger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logging</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select how to log" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="telemetry">Telemetry</SelectItem>
                        <SelectItem value="epilogue">Epilogue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Telemetry logs from the mechanism&apos;s periodic(). Epilogue logs the getters marked @Logged, and needs
                      @Logged on Robot (and RobotContainer) with Epilogue.bind(this), or Epilogue.update(this) for Commands
                      v3.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telemetry.ntKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NetworkTables Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Subsystem" {...field} />
                    </FormControl>
                    <FormDescription>Base path for telemetry values</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telemetry.positionUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Rotations">Rotations</SelectItem>
                        <SelectItem value="Radians">Radians</SelectItem>
                        <SelectItem value="Degrees">Degrees</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Telemetry Values</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telemetry.position"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Position</FormLabel>
                          <FormDescription>Log motor position</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telemetry.velocity"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Velocity</FormLabel>
                          <FormDescription>Log motor velocity</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telemetry.voltage"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Voltage</FormLabel>
                          <FormDescription>Log applied voltage</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telemetry.temperature"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Temperature</FormLabel>
                          <FormDescription>Log motor temperature</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telemetry.current"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Current</FormLabel>
                          <FormDescription>Log motor current</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        )}

        {mechanismType === "Elevator" && (
          <AccordionItem value="elevatorParams">
            <AccordionTrigger>Elevator Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="elevatorParams.startingHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Height (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="elevatorParams.hardLimitMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hard Limit Min (m)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Minimum height for simulation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="elevatorParams.hardLimitMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hard Limit Max (m)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Maximum height for simulation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="elevatorParams.mass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mass</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="elevatorParams.massUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mass Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mass unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="elevatorParams.driveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drive</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "drum"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select what lifts the carriage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="drum">Drum (spool and rope)</SelectItem>
                          <SelectItem value="chain">Chain</SelectItem>
                          <SelectItem value="belt">Belt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>What the gearbox output turns to lift the carriage</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {elevatorDriveType === "drum" && (
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="elevatorParams.drumRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drum Radius (m)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>Radius of the drum the rope winds onto</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {elevatorDriveType === "chain" && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="elevatorParams.chainPitch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chain</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? "25"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select the chain" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="25">#25 (0.25 in pitch)</SelectItem>
                              <SelectItem value="35">#35 (0.375 in pitch)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>The two chains FRC robots use</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="elevatorParams.sprocketTeeth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sprocket Teeth</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>Teeth on the sprocket the gearbox turns</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {elevatorDriveType === "belt" && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="elevatorParams.beltPitchMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Belt Pitch (mm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>5 mm for HTD belts, 3 mm for GT2 belts</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="elevatorParams.sprocketTeeth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pulley Teeth</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>Teeth on the pulley the gearbox turns</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="elevatorParams.cascade"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Cascade</FormLabel>
                        <FormDescription>
                          Each stage moves as far again as the one below it, so the carriage moves the stage count times as
                          far as the chain or belt
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {elevatorCascade && (
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="elevatorParams.cascadeStages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moving Stages</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(e, field.onChange)}
                            />
                          </FormControl>
                          <FormDescription>Stages that move, counting the carriage, for example 2 or 3</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {mechanismType === "Arm" && (
          <AccordionItem value="armParams">
            <AccordionTrigger>Arm Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="armParams.length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arm Length (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="armParams.startingPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Position (degrees)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>Initial angle for simulation</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="armParams.hardLimitMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hard Limit Min (deg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Minimum angle for simulation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="armParams.hardLimitMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hard Limit Max (deg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Maximum angle for simulation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="armParams.mass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mass</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="armParams.massUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mass Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mass unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="armParams.centerOfMass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Center of Mass (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => handleNumberChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormDescription>Distance from fulcrum to center of Mass in meters.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {mechanismType === "Flywheel" && (
          <AccordionItem value="flywheelParams">
            <AccordionTrigger>Flywheel Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="flywheelParams.momentOfInertia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moment of Inertia (kg·m²)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>
                        Rotational inertia of the flywheel about its axis (from CAD or ReCalc)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flywheelParams.diameter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wheel Diameter (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(e, field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>Used by YAMS to draw the flywheel and to convert to surface speed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
