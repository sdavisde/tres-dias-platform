@regression
Feature: Roster building and weekend leadership
  Leaders whose only permissions come from their CHA role on the active weekend keep building rosters
  and recording team payments; everyone else is kept out. Covers FR-4.3, FR-4.4, FR-6.2 to FR-6.4.

  Background:
    Given an ACTIVE weekend group with a Men's and a Women's weekend

  # --- Roster builder as Rector-by-CHA --------------------------------------------------------------------

  @E0-ROSTER-001 @rector @unit-4 @unit-6
  Scenario: Rector by CHA opens the roster builder
    Given I am signed in as the Rector of the active weekend
    And I hold no database roles
    When I open "/roster-builder"
    Then I see the draft roster board for my weekend                                       # READ_TEAM_ROSTER_BUILDER via CHA

  @E0-ROSTER-002 @rector @unit-4 @unit-6
  Scenario: Rector adds a draft roster member
    Given I am signed in as the Rector of the active weekend
    And I am on "/roster-builder"
    When I assign a member to the "Table Leader" role
    Then the member appears on the draft board
    And the draft row records me as its creator                                              # FR-4.3 createdBy from session

  @E0-ROSTER-003 @rector @unit-4 @unit-6
  Scenario: Rector removes a draft roster member
    Given I am signed in as the Rector of the active weekend
    And a draft roster row exists
    When I remove that draft member
    Then the member is no longer on the draft board

  @E0-ROSTER-004 @rector @unit-4 @unit-6
  Scenario: Rector finalizes a draft member onto the weekend roster
    Given I am signed in as the Rector of the active weekend
    And a draft roster row exists
    When I finalize that member
    Then a weekend roster row exists for the member with the assigned CHA role            # FR-6.3 hp('WRITE_TEAM_ROSTER')
    And any existing payments for the member are synced to the roster                       # admin-client sync unchanged

  @E0-ROSTER-005 @rector @unit-4 @unit-6
  Scenario: Rector drops and then removes a finalized member
    Given I am signed in as the Rector of the active weekend
    And a finalized roster row exists
    When I drop that member
    Then the roster row is marked dropped
    When I remove the dropped member
    Then the roster row is gone

  @E0-ROSTER-006 @rector
  Scenario: Roster builder respects role eligibility rules
    Given I am signed in as the Rector of the active weekend
    When I try to assign a member who has never served to "Head"
    Then the builder refuses the assignment                                                  # existing constraint, unchanged

  @E0-ROSTER-007 @rector
  Scenario: Rector sees the experience distribution and community data
    Given I am signed in as the Rector of the active weekend
    When I open "/roster-builder"
    Then I see the community member list and the experience distribution                    # getRosterBuilderCommunityData demoted, still rendered server-side

  # --- Team payments from the hub -------------------------------------------------------------------------------

  @E0-ROSTER-010 @rector @unit-4 @unit-6
  Scenario Outline: Leadership records a team cash or check payment from the team tab
    Given I am signed in as <persona>
    And a team member on the active weekend owes a team fee
    When I open the team tab of the active Men's weekend hub
    Then I see the payment column and a "+ Payment" button                                  # READ_WRITE_TEAM_PAYMENTS via CHA
    When I record a "<method>" payment for the full amount
    Then a payment transaction exists for that member with method "<method>"                 # FR-4.4, FR-6.4
    And the member's balance shows paid

    Examples:
      | persona                            | method |
      | the Rector of the active weekend   | cash   |
      | the Assistant Head Cha             | check  |

  @E0-ROSTER-011 @treasurer @unit-4
  Scenario: Treasurer records a team payment from the team tab
    Given I am signed in as the Treasurer
    And a team member on the active weekend owes a team fee
    When I record a cash payment from the team tab
    Then a payment transaction exists for that member                                         # WRITE_PAYMENTS branch of the gate

  @E0-ROSTER-012 @rector
  Scenario: Rector sees special needs and medical fields on the roster
    Given I am signed in as the Rector of the active weekend
    When I open the team tab of the active Men's weekend hub
    Then I see the special needs column
    # known follow-up: medical profiles are read with the session client, so CHA leaders may see only
    # their own row until the surfaced bug is fixed (spec: Known Bugs, surfaced)

  # --- Admin roster edits (DB-role holders) -------------------------------------------------------------------

  @E0-ROSTER-020 @leaders @unit-6
  Scenario: Leaders Committee adds and updates a roster row from admin weekends
    Given I am signed in as a Leaders Committee member
    When I open "/admin/weekends" and add a member to the active Men's roster as "Prayer"
    Then the roster row exists
    When I change that member's CHA role to "Palanca"
    Then the roster row shows "Palanca"                                                        # WRITE_TEAM_ROSTER via DB role

  @E0-ROSTER-021 @leaders
  Scenario: Leaders Committee opens the roster builder
    Given I am signed in as a Leaders Committee member
    When I open "/roster-builder"
    Then I see the draft roster board                                                          # READ_TEAM_ROSTER_BUILDER via DB role

  # --- Inheritance ----------------------------------------------------------------------------------------------

  @E0-ROSTER-022 @unit-6
  Scenario: A role inheriting WRITE_TEAM_ROSTER from its base role can write roster rows
    Given a role "Junior Leaders" based on "Leaders Committee" with no permissions of its own
    And I am signed in as a user holding only "Junior Leaders"
    When I add a member to the active Men's roster from "/admin/weekends"
    Then the roster row exists                                                                 # FR-6.1 inheritance CTE

  # --- Negative -------------------------------------------------------------------------------------------------

  @E0-ROSTER-030 @team-member @unit-4 @security
  Scenario: A non-leadership team member cannot open the roster builder
    Given I am signed in as a team member on the active weekend
    When I open "/roster-builder"
    Then I am redirected or shown an unauthorized page

  @E0-ROSTER-031 @team-member @unit-4 @security
  Scenario Outline: A non-leadership team member cannot call roster builder actions
    Given I am signed in as a team member on the active weekend
    When I invoke the server action "<action>" with valid arguments
    Then the result is "Unauthorized"                                                          # FR-4.3

    Examples:
      | action                        |
      | addDraftRosterMember          |
      | removeDraftRosterMember       |
      | finalizeDraftRosterMember     |
      | dropFinalizedRosterMember     |
      | removeFinalizedRosterMember   |

  @E0-ROSTER-032 @team-member @unit-6 @api @security
  Scenario: A team member cannot promote themselves to Rector directly
    Given I am signed in as a team member on the active weekend
    When I request "PATCH /rest/v1/weekend_roster?id=eq.<my row>" with my session setting cha_role "Rector"
    Then zero rows are updated                                                                  # FR-6.3 closes the escalation

  @E0-ROSTER-033 @team-member @unit-4 @security
  Scenario: A team member cannot record team payments
    Given I am signed in as a team member on the active weekend
    When I open the team tab of the active Men's weekend hub
    Then I do not see a "+ Payment" button
    When I invoke the server action "recordManualPayment" for another member
    Then the result is "Unauthorized"

  @E0-ROSTER-034 @unit-4 @security
  Scenario: A custom role with only READ_TEAM_ROSTER_BUILDER can view but not change the builder
    Given a role "Roster Viewer" with only READ_TEAM_ROSTER_BUILDER
    And I am signed in as a user holding only "Roster Viewer"
    When I open "/roster-builder"
    Then I see the draft roster board
    When I try to finalize a draft member
    Then the result is "Unauthorized"                                                            # documented constraint (FR-4.3 compatibility note)

  @E0-ROSTER-035 @rector @unit-6 @security
  Scenario: CHA permissions end when the weekend group is no longer active
    Given I was the Rector of a weekend group that is now COMPLETED
    And I hold no database roles
    When I open "/roster-builder"
    Then I am redirected or shown an unauthorized page
    When I request "POST /rest/v1/weekend_roster" with my session
    Then the response is a permission error                                                      # FR-6.2 w.status = 'ACTIVE'

  @E0-ROSTER-036 @rector @unit-6 @security
  Scenario: A dropped Rector loses CHA permissions
    Given I was the Rector of the active weekend but my roster row is marked dropped
    When I invoke the server action "finalizeDraftRosterMember"
    Then the result is "Unauthorized"

  @E0-ROSTER-037 @rector @unit-4 @security
  Scenario: The Rector cannot record candidate payments without a candidate permission
    Given I am signed in as the Rector of the active weekend
    And I hold no database roles
    When I invoke the server action "recordManualCandidatePayment" for a candidate
    Then the action accepts my READ_WRITE_TEAM_PAYMENTS                                            # FR-4.4 either-permission gate
    But the database rejects the insert with a permission error                                    # FR-6.4: candidate targets need WRITE_PAYMENTS
    And no payment is recorded
    # confirmed: services/candidates/actions.ts + payment_transaction_insert_payments_or_team_cash.
    # Leadership-by-CHA may record team cash/check only; the Rector cannot reach the review page anyway
    # without READ_CANDIDATES (see E0-CAND-041).
