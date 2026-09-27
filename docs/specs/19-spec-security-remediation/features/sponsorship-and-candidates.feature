@regression
Feature: Sponsorship and candidate review
  Members sponsor candidates; the Pre-Weekend Couple reviews, sends forms, approves, records payments
  and moves candidates. Covers FR-4.1, FR-4.4, FR-4.8, FR-5.x and FR-6.5.

  # --- Sponsoring ------------------------------------------------------------------------------------

  @E0-CAND-001 @member @unit-4
  Scenario: Member submits the sponsor form
    Given I am signed in as a member with no roles
    And an ACTIVE weekend group is accepting candidates
    When I open "/sponsor" and complete the sponsorship form for a new candidate
    Then I land on "/sponsor/submitted"
    And a candidate exists in status "sponsored" with my sponsorship info                # FR-4.8 authenticated
    And the sponsorship notification email is recorded in the email log

  @E0-CAND-002 @member
  Scenario: Sponsor form dev autofill is not present in production
    Given I am signed in as a member with no roles
    When I open "/sponsor" in a production build
    Then I do not see a "Fill with test data" button

  @E0-CAND-003 @member
  Scenario: Submitted page shows the sponsored candidate
    Given I just sponsored a candidate
    When I open "/sponsor/submitted" for that candidate
    Then I see the candidate's name and next steps

  # --- Review queue (Pre-Weekend Couple) ---------------------------------------------------------------

  @E0-CAND-010 @pwc
  Scenario: PWC opens the review queue
    Given I am signed in as a Pre-Weekend Couple member
    And an ACTIVE weekend has candidates in several statuses
    When I open the review candidates page for the active Men's weekend
    Then I see every candidate with their status
    And I see medical notes because I hold READ_CANDIDATE_MEDICAL_INFO

  @E0-CAND-011 @pwc @unit-4
  Scenario: PWC sends the candidate forms link
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "sponsored"
    When I open that candidate in the review page and choose "Send candidate forms"
    Then the candidate's status is "awaiting_forms"
    And a candidate forms email is recorded for the candidate's email                    # FR-4.1
    # assumption: status transition name

  @E0-CAND-012 @pwc @unit-4
  Scenario: PWC approves a candidate and requests payment
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "pending_approval" whose forms are complete
    When I approve the candidate and confirm the payment owner
    Then the candidate's status is "awaiting_payment"
    And a payment request email is recorded for the payment owner                        # FR-4.1 sendPaymentRequestEmail

  @E0-CAND-013 @pwc @unit-4
  Scenario: PWC edits the payment owner
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "pending_approval"
    When I change the payment owner to the sponsor
    Then the sponsorship info shows the sponsor as payment owner                          # FR-4.1, Open Question default WRITE_CANDIDATES

  @E0-CAND-014 @pwc @unit-4
  Scenario: PWC records a cash or check candidate payment
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "awaiting_payment"
    When I choose "Record cash/check payment" for the candidate and enter the full amount by check
    Then a payment transaction exists for the candidate with method "check"              # FR-4.4
    And the candidate no longer owes a fee
    And a payment-received email is recorded for the PWC address

  @E0-CAND-015 @pwc @unit-4
  Scenario: PWC moves a candidate to another weekend
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate on the active Men's weekend
    And a PLANNING weekend group exists
    When I choose "Move" and pick the planning Men's weekend
    Then the candidate is listed on the planning weekend
    And any payments follow the candidate                                                 # existing behaviour

  @E0-CAND-016 @pwc
  Scenario: PWC edits candidate fields inline
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "pending_approval"
    When I edit the candidate's church and the sponsor's phone on the detail page
    Then the changes auto-save and persist after reload

  @E0-CAND-017 @pwc @unit-6
  Scenario: PWC status changes still write through RLS
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "awaiting_payment"
    When I mark the candidate as "confirmed" from the review page
    Then the candidate's status is "confirmed"                                            # FR-6.5 hp('WRITE_CANDIDATES')

  @E0-CAND-018 @pwc
  Scenario: PWC deletes a candidate from the review page
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "sponsored"
    When I delete the candidate from the review UI, if the UI offers it
    Then the candidate and its info rows are gone                                          # FR-6.5 DELETE_CANDIDATES
    # assumption: PWC holds DELETE_CANDIDATES; verify the UI exposes delete at all (the old unguarded
    # deleteCandidate export had no callers and is removed by FR-3.4)

  # --- Hub candidates tab ----------------------------------------------------------------------------------

  @E0-CAND-020 @pwc
  Scenario: Hub candidates tab lists candidates and exports CSV
    Given I am signed in as a Pre-Weekend Couple member
    When I open the candidates tab of the active Men's weekend hub
    Then I see the candidate table
    When I export the list
    Then a CSV downloads with the columns I am allowed to see

  @E0-CAND-021 @member
  Scenario: Member without candidate permissions sees the candidates tab without medical or contact columns
    Given I am signed in as a member with no roles
    When I open the candidates tab of the active Men's weekend hub
    Then I see candidate names
    And I do not see medical, address or contact columns                                  # client-side gating, unchanged (Non-Goal)

  # --- Limited permission holders ---------------------------------------------------------------------------

  @E0-CAND-030 @admin
  Scenario: READ_CANDIDATES without WRITE_CANDIDATES is read-only
    Given I am signed in as an Admin
    When I open the review candidates page for the active Men's weekend
    Then I see the candidates
    But I do not see approve, send forms, move or payment actions

  @E0-CAND-031 @admin @unit-4 @security
  Scenario Outline: READ_CANDIDATES holder cannot call the write actions
    Given I am signed in as an Admin
    When I invoke the server action "<action>" for a candidate
    Then the result is "Unauthorized"                                                        # FR-4.1

    Examples:
      | action                        |
      | updateCandidatePaymentOwner   |
      | sendCandidateForms            |
      | sendPaymentRequestEmail       |
      | getMoveWeekendOptions         |
      | updateCandidateStatus         |

  @E0-CAND-032 @admin @unit-6 @api @security
  Scenario: READ_CANDIDATES holder cannot update a candidate row directly
    Given I am signed in as an Admin
    When I request "PATCH /rest/v1/candidates?id=eq.<id>" with my session setting status "confirmed"
    Then zero rows are updated                                                               # FR-6.5

  @E0-CAND-033 @member @unit-6 @api @security
  Scenario: Member cannot update candidate info directly
    Given I am signed in as a member with no roles
    When I request "PATCH /rest/v1/candidate_info?candidate_id=eq.<id>" with my session
    Then zero rows are updated

  @E0-CAND-034 @member @unit-6 @api
  Scenario: Member can still insert a candidate and sponsorship info (sponsor form path)
    Given I am signed in as a member with no roles
    When the sponsor form inserts a candidate and sponsorship info with my session
    Then both rows are created                                                               # FR-6.5 INSERT stays open

  # --- Rector medical read (CHA) ------------------------------------------------------------------------------

  @E0-CAND-040 @rector
  Scenario: Rector sees candidate medical info on the review page
    Given I am signed in as the Rector of the active weekend
    And I also hold a DB role with READ_CANDIDATES
    When I open the review candidates page for the active Men's weekend
    Then I see medical notes because the Rector CHA role grants READ_CANDIDATE_MEDICAL_INFO
    # assumption: Rector reaches the page only with READ_CANDIDATES from a DB role
