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
  getCompatibleControllers,
} from "@/lib/config/hardware-config"

export default function MechanismForm({ form }: { form: UseFormReturn<any> }) {
  const mechanismType = form.watch("mechanismType")
  const motorControllerType = form.watch("motorControllerType")
  const motorType = form.watch("motorType")

  // Get compatible options based on current selections
  const isKraken = motorType === "Krakenx40" || motorType === "Krakenx60"

  // Get all available controllers and motors from the configuration
  const allControllers = Object.values(MOTOR_CONTROLLERS)
  const allMotors = Object.values(MOTORS)

  // Get compatible controllers and motors based on current selections
  const compatibleControllers = getCompatibleControllers(motorType)
  const compatibleMotors = getCompatibleMotors(motorControllerType)

  // Handle motor controller change
  const handleMotorControllerChange = (value: string) => {
    form.setValue("motorControllerType", value)

    // If changing away from TalonFX and using a Kraken motor, switch to NEO
    if (value !== "TalonFX" && (motorType === "Krakenx40" || motorType === "Krakenx60")) {
      form.setValue("motorType", "NEO")
    }
  }

  // Handle motor type change
  const handleMotorTypeChange = (value: string) => {
    form.setValue("motorType", value)

    // If changing to a Kraken motor and not using TalonFX, switch to TalonFX
    if ((value === "Krakenx40" || value === "Krakenx60") && motorControllerType !== "TalonFX") {
      form.setValue("motorControllerType", "TalonFX")
    }
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
                    <Input placeholder="ElevatorSubsystem" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                        {compatibleControllers.map((controller) => (
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
                    <FormDescription>{isKraken ? "Kraken motors can only be used with TalonFX" : ""}</FormDescription>
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
                    <FormDescription>Motor rotations per mechanism rotation</FormDescription>
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
                <Label>PID Values</Label>
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
                      <FormDescription>Maximum velocity in rotations per second</FormDescription>
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
                      <FormDescription>Maximum acceleration in rotations per second²</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Soft Limits</Label>
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
                        <FormDescription>Maximum position limit</FormDescription>
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
                        <FormDescription>Minimum position limit</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
                          <FormDescription>Only for elevators and arms</FormDescription>
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

        <AccordionItem value="telemetry">
          <AccordionTrigger>Telemetry</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
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
                      <FormDescription>
                        Drum/sprocket radius for converting rotations to linear distance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
