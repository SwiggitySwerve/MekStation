# Dashboard Crash Addendum

Live smoke found a host dashboard crash after clicking `Advance Day` in an
active co-op campaign with a connected guest. The crash text was
`Cannot read properties of undefined (reading 'finances')`.

The failing render access is `src/components/campaign/DayReportPanel.tsx:115`:
`lastReport.campaign.finances.balance.isNegative()`. The undefined value was
`lastReport.campaign`, not `campaign.finances`. The producer was the dashboard
day-report hook treating an async co-op `advanceDay()` result as a synchronous
`DayReport`. In co-op mode, `advanceDay()` can return
`Promise<DayReport | null>` while it waits for persistence and live push. The
old synchronous hook considered the pending Promise truthy, stored it in
`dayReports`, and rendered `DayReportPanel` with a Promise instead of a
`DayReport`.

The fix keeps day-report rendering behind Promise resolution and only stores a
real `DayReport`. The command-center day card now also consumes async advance
results instead of discarding the Promise.

A related rollback bug was fixed in the persistence store: `lastPersistedCampaign`
was previously captured from the mutable live campaign store when an async PUT
resolved. A later optimistic mutation could therefore become the rollback
baseline even though it was not the accepted server record. The persistence
store now derives `lastPersistedCampaign` from the returned
`SerializedCampaign` record, and conflict rollback prefers the current server
record when a 409 response supplies one.

Guest-side check: the host conflict path does not emit `CampaignDayAdvanced`,
so the guest mirror remains on the old date. The guest projection path still
guards both the authoritative mirror and current campaign before calling
`applyAuthoritativeStateToGuestCampaign`; the render regression confirms no
day-advanced event is delivered on the failed host save path.
