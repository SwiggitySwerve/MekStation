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

### Requirement: Market-Derived Contract Acceptance

A campaign authority SHALL derive every contract acceptance from the contract-market offer it holds. An `AcceptContract` intent SHALL only name the contract; the authority SHALL take the committed contract's name and employer from its stored offer and SHALL judge the faction-standing gate on that employer. It SHALL refuse a contract it does not hold (`offer-not-found`), one already accepted (`offer-consumed`), one the player declined (`offer-declined`) and one whose end date is before its campaign date (`offer-expired`), committing nothing. An authority with no contract market to read SHALL refuse every `AcceptContract` (`offer-source-unavailable`). The server co-op host SHALL read the markets from the campaign's saved record at each intent, and the in-browser co-op host SHALL read them from the host's live campaign. A co-op command's record rewrite SHALL drop the personnel offers whose recruit the journal has enrolled and the contract offers the journal holds as accepted, keeping a decline only beside an offer still listed.

#### Scenario: The co-op host commits the stored contract

- **GIVEN** a co-op host whose saved record holds contract `contract-row` for employer `house-davion`
- **WHEN** an approved `AcceptContract` names `contract-row` with a different name and employer
- **THEN** the host SHALL commit `ContractAccepted` with the stored name and `house-davion`

#### Scenario: A declined contract cannot be accepted in co-op

- **GIVEN** a co-op host whose market lists a contract the player declined
- **WHEN** an `AcceptContract` names it
- **THEN** the host SHALL refuse it with `offer-declined` and commit nothing

#### Scenario: A host with no market refuses

- **GIVEN** a server co-op host running with no campaign database
- **WHEN** a `HireOffer` or `AcceptContract` arrives
- **THEN** the host SHALL refuse it with `offer-source-unavailable`

#### Scenario: Consumed offers leave the saved market

- **GIVEN** a journal-authority co-op campaign whose saved record lists a recruit and a contract
- **WHEN** the co-op host commits a hire of that recruit and an acceptance of that contract
- **THEN** the saved record's markets SHALL no longer list either offer
