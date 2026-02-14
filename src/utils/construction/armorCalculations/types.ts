export interface ArmorAllocationResult {
  head: number;
  centerTorsoFront: number;
  centerTorsoRear: number;
  leftTorsoFront: number;
  leftTorsoRear: number;
  rightTorsoFront: number;
  rightTorsoRear: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
  centerLeg: number;
  frontLeftLeg: number;
  frontRightLeg: number;
  rearLeftLeg: number;
  rearRightLeg: number;
  totalAllocated: number;
  unallocated: number;
}
