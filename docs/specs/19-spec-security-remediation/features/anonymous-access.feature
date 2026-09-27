@anonymous @regression
Feature: Anonymous access
  Logged-out visitors can use exactly the public pages and the two candidate flows, and nothing else.
  Covers FR-1.4, FR-1.6, FR-1.7, FR-5.1 to FR-5.8, FR-7.4 and the anonymous half of FR-8.4.

  Background:
    Given I am an anonymous visitor

  # --- Public pages still load -------------------------------------------------------------------

  @E0-ANON-001
  Scenario Outline: Public pages render without a session
    When I open "<path>"
    Then the page renders without redirecting to "/login"

    Examples:
      | path              |
      | /                 |
      | /login            |
      | /join             |
      | /forgot-password  |
      | /reset-password   |
      | /secuela-signin   |

  @E0-ANON-002
  Scenario: Secuela sign-in page offers login and join links
    When I open "/secuela-signin"
    Then I see a link to "/login" that returns me to "/secuela-signin" after signing in
    And I see a link to "/join" that returns me to "/secuela-signin" after registering

  # --- Candidate forms (the first public flow) ---------------------------------------------------

  @E0-ANON-010 @unit-5
  Scenario: Candidate opens their forms link
    Given a candidate in status "awaiting_forms" with no submitted candidate info
    When I open the candidate forms page for that candidate
    Then I see the candidate's name and the sponsor's name
    And the page does not contain any medical, address or emergency-contact data   # FR-5.1

  @E0-ANON-011 @unit-5
  Scenario: Candidate submits their forms once
    Given a candidate in status "awaiting_forms" with no submitted candidate info
    And I am on the candidate forms page for that candidate
    When I fill in every required field and submit
    Then I am taken to the forms success page
    And the candidate's status is "pending_approval"
    And exactly one candidate info row exists for that candidate                   # FR-5.3

  @E0-ANON-012 @unit-5
  Scenario: Reopening a submitted forms link shows the already-submitted state
    Given a candidate in status "pending_approval" whose candidate info was submitted
    When I open the candidate forms page for that candidate
    Then I see an "already submitted" message instead of the form                  # FR-5.2
    # assumption: exact copy of the message

  @E0-ANON-013 @unit-5 @security
  Scenario: Resubmitting does not create a duplicate or flip the status back
    Given a candidate in status "pending_approval" whose candidate info was submitted
    When the forms submission is replayed for that candidate
    Then the submission is rejected
    And exactly one candidate info row exists for that candidate
    And the candidate's status is still "pending_approval"

  @E0-ANON-014 @unit-5 @security
  Scenario Outline: Invalid or unknown candidate ids do not reveal anything
    When I open the candidate forms page for "<id>"
    Then I see a not-found page
    # assumption: not-found rather than a generic error

    Examples:
      | id                                   |
      | not-a-uuid                           |
      | 00000000-0000-0000-0000-000000000000 |

  @E0-ANON-015 @unit-5 @security
  Scenario: The forms page cannot be used on a candidate who is not awaiting forms
    Given a candidate in status "confirmed"
    When I open the candidate forms page for that candidate
    Then I do not see the form

  # --- Candidate fee checkout (the second public flow) -------------------------------------------

  @E0-ANON-020 @unit-5
  Scenario: Candidate fee page loads from the payment-request link
    Given a candidate in status "awaiting_payment" with an unpaid candidate fee
    When I open the candidate fee page for that candidate
    Then I see the candidate's payment owner and the amount due                    # FR-5.5

  @E0-ANON-021 @unit-5
  Scenario: Candidate fee checkout redirects to Stripe and records the payment
    Given a candidate in status "awaiting_payment" with an unpaid candidate fee
    And I am on the candidate fee page for that candidate
    When I start checkout
    Then I am redirected to a Stripe Checkout session
    When Stripe completes the test payment and sends the checkout.session.completed webhook
    Then a payment transaction exists for that candidate
    And the candidate's status is "confirmed"
    And I land on the candidate fee success page

  @E0-ANON-022 @unit-5 @security
  Scenario: Candidate fee page rejects a non-UUID id
    When I open the candidate fee page for "not-a-uuid"
    Then I see a not-found page

  @E0-ANON-023 @api
  Scenario: Stripe webhook rejects an unsigned request
    When a checkout.session.completed event is posted to "/api/webhooks/stripe" without a valid signature
    Then the response status is 400
    And no payment transaction is created

  # --- Protected pages redirect --------------------------------------------------------------------

  @E0-ANON-030
  Scenario Outline: Member and admin pages redirect to login
    When I open "<path>"
    Then I am redirected to "/login"

    Examples:
      | path               |
      | /home              |
      | /profile           |
      | /sponsor           |
      | /team-forms        |
      | /roster-builder    |
      | /weekends          |
      | /files             |
      | /admin             |
      | /admin/people      |
      | /admin/payments    |

  # --- Direct database access with the publishable key ----------------------------------------------

  @E0-ANON-040 @unit-1 @api @security
  Scenario Outline: The publishable key cannot read protected tables
    When I request "GET /rest/v1/<table>?select=*&limit=1" with only the publishable key
    Then the response is a permission error or an empty list                        # FR-1.6

    Examples:
      | table                       |
      | users                       |
      | roles                       |
      | user_roles                  |
      | weekend_roster              |
      | weekend_group_members       |
      | payment_transaction         |
      | events                      |
      | community_encouragements    |
      | site_settings               |
      | email_log                   |

  @E0-ANON-041 @unit-5 @api @security
  Scenario Outline: After Unit 5 the publishable key cannot read candidate tables either
    When I request "GET /rest/v1/<table>?select=*&limit=1" with only the publishable key
    Then the response is a permission error or an empty list                        # FR-5.7

    Examples:
      | table                       |
      | candidates                  |
      | candidate_info              |
      | candidate_sponsorship_info  |

  @E0-ANON-042 @unit-1 @api @security
  Scenario Outline: The publishable key cannot write anything
    When I request "<method> /rest/v1/<table>" with only the publishable key and a valid body
    Then the response is a permission error
    And no row was changed

    Examples:
      | method | table            |
      | POST   | user_roles       |
      | POST   | roles            |
      | PATCH  | users            |
      | DELETE | users            |
      | POST   | candidates       |
      | POST   | candidate_info   |
      | PATCH  | candidates       |
      | POST   | payment_transaction |

  @E0-ANON-043 @unit-1 @api @security
  Scenario: The publishable key cannot list or read stored files
    When I request the storage objects listing for bucket "files" with only the publishable key
    Then the response is a permission error or an empty list                        # FR-1.7
    But a public avatar URL still loads                                             # avatars stay public-read

  @E0-ANON-044 @unit-7 @api @security
  Scenario: The file download route requires a session
    When I request "/api/files/download?bucket=files&path=any.pdf" without a session
    Then the response status is 401                                                  # FR-7.4

  # --- Server actions ------------------------------------------------------------------------------

  @E0-ANON-050 @unit-3 @unit-4 @api @security
  Scenario Outline: Privileged server actions reject anonymous callers
    When I invoke the server action "<action>" without a session
    Then the result is "Unauthorized"
    And nothing changed

    Examples:
      | action                            |
      | createCandidateWithSponsorshipInfo |
      | updateCandidatePaymentOwner       |
      | sendCandidateForms                |
      | sendPaymentRequestEmail           |
      | recordManualPayment               |
      | recordManualCandidatePayment      |
      | addDraftRosterMember              |
      | finalizeDraftRosterMember         |
      | createEvent                       |
      | updateUserBasicInfo               |
      | signStatementOfBelief             |
      | getAllUsers                       |

  @E0-ANON-051 @unit-3 @api @security
  Scenario Outline: Demoted or deleted exports are no longer callable endpoints
    When I look up the server action id for "<former export>"
    Then no server action with that name exists in the build                        # FR-3.4, FR-3.5

    Examples:
      | former export                     |
      | deleteUser                        |
      | deleteCandidate                   |
      | getAllCandidatesWithDetails       |
      | getHydratedCandidate              |
      | getMasterRoster                   |
      | getWeekendRosterViewData          |
      | getWeekendRosterRecord            |
      | notifyCandidatePaymentReceivedAdmin |
