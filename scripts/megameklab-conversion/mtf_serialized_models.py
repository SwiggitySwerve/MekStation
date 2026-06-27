"""Serialized unit DTOs emitted by the MTF converter."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class SerializedEngine:
    """Engine configuration."""

    type: str
    rating: int


@dataclass
class SerializedGyro:
    """Gyro configuration."""

    type: str


@dataclass
class SerializedStructure:
    """Internal structure configuration."""

    type: str


@dataclass
class SerializedArmor:
    """Armor configuration."""

    type: str
    allocation: Dict[str, Any]


@dataclass
class SerializedHeatSinks:
    """Heat sink configuration."""

    type: str
    count: int


@dataclass
class SerializedMovement:
    """Movement configuration."""

    walk: int
    jump: int
    jumpJetType: Optional[str] = None
    enhancements: Optional[List[str]] = None


@dataclass
class SerializedEquipment:
    """Mounted equipment item."""

    id: str
    location: str
    slots: Optional[List[int]] = None
    isRearMounted: Optional[bool] = None
    linkedAmmo: Optional[str] = None


@dataclass
class SerializedFluff:
    """Fluff/flavor text."""

    overview: Optional[str] = None
    capabilities: Optional[str] = None
    history: Optional[str] = None
    deployment: Optional[str] = None
    variants: Optional[str] = None
    notableUnits: Optional[str] = None
    manufacturer: Optional[str] = None
    primaryFactory: Optional[str] = None
    systemManufacturer: Optional[Dict[str, str]] = None


@dataclass
class SerializedUnit:
    """Complete serialized unit matching ISerializedUnit interface."""

    id: str
    chassis: str
    model: str
    unitType: str
    configuration: str
    techBase: str
    rulesLevel: str
    era: str
    year: int
    tonnage: int
    engine: SerializedEngine
    gyro: SerializedGyro
    cockpit: str
    structure: SerializedStructure
    armor: SerializedArmor
    heatSinks: SerializedHeatSinks
    movement: SerializedMovement
    equipment: List[SerializedEquipment]
    criticalSlots: Dict[str, List[Optional[str]]]
    variant: Optional[str] = None
    quirks: Optional[List[str]] = None
    fluff: Optional[SerializedFluff] = None
    mulId: Optional[int] = None
    role: Optional[str] = None
    source: Optional[str] = None
