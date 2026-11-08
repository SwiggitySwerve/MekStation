## ADDED Requirements

### Requirement: Market-Derived Hiring Authority

A campaign authority SHALL derive every hire from the personnel-market offer it holds. A `HireOffer` intent SHALL name only the offer id; the authority SHALL take the hired pilot's name and the C-bill cost from its stored offer and SHALL derive the pilot id from the offer id. It SHALL refuse a hire whose offer it does not hold or cannot read completely (`offer-not-found`), an offer already hired (`offer-consumed`), an offer that lapsed before its campaign date (`offer-expired`), and a hire the balance cannot cover (`insufficient-funds`), committing nothing. An authority with no market to read SHALL refuse every `HireOffer` (`offer-source-unavailable`). Every authority SHALL refuse a `HirePilot` intent (`hire-requires-market-offer`). The durable command endpoint SHALL parse the whole intent against the intent schema before validation and SHALL refuse a `HireOffer` payload that carries any field besides the offer id.

#### Scenario: A guest cannot price its own hire

- **GIVEN** a co-op guest seated on a journal-authority campaign whose source record holds a personnel offer
- **WHEN** the guest posts a `HireOffer` that also carries its own pilot and a cost of 0
- **THEN** the endpoint SHALL refuse it as malformed
- **AND** nothing SHALL be appended

#### Scenario: A hire takes the stored offer's recruit and price

- **GIVEN** a source record holding an offer for "Stored Recruit" at 120,000 C-bills
- **WHEN** a seated caller posts a `HireOffer` naming that offer
- **THEN** the authority SHALL commit `FundsChanged` of -120,000 and `PilotHired` for pilot `hired-<offerId>` named "Stored Recruit"
- **AND** the source record SHALL lose the offer and gain a `tx-hire-<offerId>` expense

#### Scenario: A retired hire intent is refused

- **GIVEN** any campaign authority
- **WHEN** it receives a `HirePilot` intent
- **THEN** it SHALL refuse it with `hire-requires-market-offer` and commit nothing

#### Scenario: An unaffordable hire enrols nobody

- **GIVEN** an offer that costs more than the campaign balance
- **WHEN** a `HireOffer` names it
- **THEN** the authority SHALL refuse it with `insufficient-funds`
- **AND** the roster, the balance and the source record SHALL be unchanged

#### Scenario: A restored offer cannot be hired twice

- **GIVEN** an offer that was hired, and a later save that restored it to the market
- **WHEN** a `HireOffer` names it again
- **THEN** the authority SHALL refuse it with `offer-consumed`
