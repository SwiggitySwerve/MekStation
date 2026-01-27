## ADDED Requirements

### Requirement: Campaign Type Classification
The system SHALL define a CampaignType enum with values MERCENARY, HOUSE_COMMAND, CLAN, PIRATE, and COMSTAR, each with display name and description metadata.

#### Scenario: All campaign types defined
- **GIVEN** the CampaignType enum is imported
- **WHEN** all values are enumerated
- **THEN** exactly 5 types exist: mercenary, house_command, clan, pirate, comstar

#### Scenario: Campaign type display metadata
- **GIVEN** CampaignType.MERCENARY
- **WHEN** CAMPAIGN_TYPE_DISPLAY is queried
- **THEN** the display name is "Mercenary Company" and a description string is available

### Requirement: Campaign Type and Preset on Campaign Entity
The system SHALL add `campaignType` (required CampaignType) and `activePreset` (optional CampaignPreset) fields to ICampaign. Existing campaigns default campaignType to MERCENARY and activePreset to CUSTOM.

#### Scenario: New campaign has campaign type
- **GIVEN** a campaign is created with campaignType CLAN
- **WHEN** the campaign is inspected
- **THEN** campaignType is CampaignType.CLAN

#### Scenario: Existing campaigns default to MERCENARY
- **GIVEN** a campaign created before this feature exists
- **WHEN** campaignType is not set
- **THEN** it defaults to CampaignType.MERCENARY

## MODIFIED Requirements

### Requirement: Campaign Creation
The system SHALL create a new campaign with default values for all required fields including personnel, forces, missions, finances, campaign type, and active preset.

#### Scenario: Create campaign with minimal parameters
- **GIVEN** a user provides campaign name "First Company" and faction ID "davion"
- **WHEN** createCampaign is called
- **THEN** a campaign is created with unique ID, name, faction, current date set to now, empty personnel Map, empty forces Map, empty missions Map, zero balance, default options, campaignType MERCENARY, and activePreset CUSTOM

#### Scenario: Create campaign with custom options
- **GIVEN** a user provides name, faction, and custom options (startingFunds: 10000000, salaryMultiplier: 1.5)
- **WHEN** createCampaign is called
- **THEN** a campaign is created with custom options merged with defaults, and starting balance set to 10000000 C-bills

#### Scenario: Campaign has unique root force
- **GIVEN** a campaign is created
- **WHEN** the campaign is inspected
- **THEN** the campaign has a rootForceId field with a unique force ID

#### Scenario: Create campaign with preset
- **GIVEN** a user provides name, faction, campaign type CLAN, and preset FULL
- **WHEN** createCampaign is called with preset application
- **THEN** the campaign options reflect the FULL preset overrides applied on top of CLAN type defaults
