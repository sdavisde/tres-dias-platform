@member @regression
Feature: Member self-service
  A logged-in member with no roles can manage their own profile, experience, team forms, secuela
  attendance and fees, and can read what every member reads. They cannot touch anyone else's rows.
  Covers FR-1.3, FR-1.7, FR-4.6 to FR-4.8, FR-6.3, FR-6.8, FR-7.4 and the member rows of FR-8.4.

  Background:
    Given I am signed in as a member with no roles

  # --- Reading what every member reads --------------------------------------------------------------

  @E0-MEMBER-001
  Scenario: Member home renders
    When I open "/home"
    Then I see the member dashboard
    And I see the current weekend hero and community encouragement

  @E0-MEMBER-002
  Scenario Outline: Weekend hub tabs render for a member
    Given an ACTIVE weekend group
    When I open the "<tab>" tab of the active Men's weekend hub
    Then the tab renders without an error

    Examples:
      | tab        |
      | overview   |
      | team       |
      | candidates |
      | schedule   |

  @E0-MEMBER-003
  Scenario: Team roster shows names and roles but no payment column for a plain member
    Given an ACTIVE weekend group
    When I open the team tab of the active Men's weekend hub
    Then I see the roster with names and CHA roles
    And I do not see a payment column or a "+ Payment" button
    And I do not see special needs or medical fields

  @E0-MEMBER-004
  Scenario: Member can browse and download community files
    Given a file exists in the "files" bucket
    When I open "/files"
    Then I see the file listed
    When I download it
    Then the download succeeds                                                      # FR-7.4 allows sessions

  @E0-MEMBER-005
  Scenario: Member sees upcoming events
    Given an upcoming event exists
    When I open "/home"
    Then I see the event in the upcoming events section

  # --- Profile ---------------------------------------------------------------------------------------

  @E0-MEMBER-010 @unit-4
  Scenario: Member edits their own basic info and address
    When I open "/profile"
    And I change my phone number and my street address
    Then the changes auto-save
    And reloading "/profile" shows the new values                                  # FR-4.7 ownsUserOrAdmin

  @E0-MEMBER-011 @unit-1
  Scenario: Member edits their own email on the profile page
    When I open "/profile"
    And I change my email through the change-email dialog with my current password
    Then the change is accepted                                                      # Open Question default: allow own email edit

  @E0-MEMBER-012 @unit-4
  Scenario: Member uploads and removes their own profile photo
    When I open "/profile"
    And I upload a profile photo
    Then my avatar shows the new photo
    And the file is stored in the "avatars" bucket under my user id                 # FR-1.7 avatar-own policy
    When I remove the photo
    Then my avatar reverts to the default

  @E0-MEMBER-013 @unit-4
  Scenario: New account uploads an avatar during registration
    Given I just registered on "/join"
    When I add a profile photo in the registration flow
    Then my avatar shows the new photo

  @E0-MEMBER-014 @unit-4 @security
  Scenario: Member cannot edit another user's profile through the action
    Given another user exists
    When I invoke the server action "updateUserBasicInfo" for the other user's id
    Then the result is "Unauthorized"
    And the other user's data is unchanged                                            # FR-4.7

  @E0-MEMBER-015 @unit-4 @security
  Scenario: Member cannot change another user's profile photo
    Given another user exists
    When I invoke the server action "updateUserProfilePhoto" for the other user's id
    Then the result is "Unauthorized"

  @E0-MEMBER-016 @unit-1 @api @security
  Scenario: Member cannot update or delete another users row directly
    Given another user exists
    When I request "PATCH /rest/v1/users?id=eq.<other id>" with my session
    Then zero rows are updated                                                        # FR-1.3
    When I request "DELETE /rest/v1/users?id=eq.<other id>" with my session
    Then zero rows are deleted

  # --- Service history / experience -------------------------------------------------------------------

  @E0-MEMBER-020 @unit-4 @unit-6
  Scenario: Member adds and deletes their own service history
    When I open the team info sheet at "/team-forms/info-sheet"
    And I add a prior weekend served with a role
    Then the entry appears in my service history
    When I delete that entry
    Then it is gone                                                                    # FR-4.7, FR-6.8

  @E0-MEMBER-021 @unit-4 @security
  Scenario: Member cannot add experience to another user
    Given another user exists
    When I invoke the server action "upsertUserExperience" for the other user's id
    Then the result is "Unauthorized"

  @E0-MEMBER-022 @unit-4 @security
  Scenario: Member cannot delete another user's experience
    Given another user has an experience entry
    When I invoke the server action "deleteUserExperience" for that entry
    Then the result is "Unauthorized"
    And the entry still exists

  # --- Team forms (as a team member on the active weekend) ---------------------------------------------

  @E0-MEMBER-030 @team-member @unit-4 @unit-6
  Scenario: Team member sees their forms progress
    Given I am signed in as a team member on the active weekend
    When I open "/team-forms"
    Then I see the five forms with their completion status

  @E0-MEMBER-031 @team-member @unit-4 @unit-6
  Scenario Outline: Team member completes each of their own forms
    Given I am signed in as a team member on the active weekend
    When I open "<path>" and complete the form
    Then the form is marked complete on "/team-forms"
    And the completion is stored against my group member row                          # FR-4.6 ownsGroupMember, FR-6.8

    Examples:
      | path                              |
      | /team-forms/statement-of-belief   |
      | /team-forms/commitment-form       |
      | /team-forms/camp-waiver           |
      | /team-forms/release-of-claim      |
      | /team-forms/info-sheet            |

  @E0-MEMBER-032 @team-member @unit-4
  Scenario: Release of claim stores special needs on the team member's roster row
    Given I am signed in as a team member on the active weekend
    When I complete "/team-forms/release-of-claim" with special needs "vegetarian"
    Then my roster row's special needs reads "vegetarian"

  @E0-MEMBER-033 @team-member @unit-4
  Scenario: Info sheet updates address, basic info and medical info for the team member
    Given I am signed in as a team member on the active weekend
    When I complete "/team-forms/info-sheet" with a new address and a medical note
    Then my profile shows the new address
    And my medical profile contains the note

  @E0-MEMBER-034 @team-member @unit-4 @security
  Scenario Outline: Team member cannot submit forms for another team member
    Given I am signed in as a team member on the active weekend
    And another team member exists on the same weekend
    When I invoke the server action "<action>" with the other team member's group member id
    Then the result is "Unauthorized"
    And the other team member's records are unchanged                                 # FR-4.6

    Examples:
      | action                  |
      | signStatementOfBelief   |
      | signCommitmentForm      |
      | signCampWaiver          |
      | submitReleaseOfClaim    |
      | completeInfoSheet       |

  @E0-MEMBER-035 @team-member @unit-4 @security
  Scenario: Team member cannot overwrite another member's special needs
    Given I am signed in as a team member on the active weekend
    And another team member exists on the same weekend
    When I invoke the server action "submitReleaseOfClaim" with the other member's group member id
    Then the result is "Unauthorized"
    And the other member's special needs are unchanged                                # closes the admin-client write hole

  @E0-MEMBER-036 @team-member @unit-4 @security
  Scenario: Team member cannot update another user's roster medical info
    Given I am signed in as a team member on the active weekend
    When I invoke the server action "updateRosterMedicalInfo" for another user's id
    Then the result is "Unauthorized"

  @E0-MEMBER-037 @member
  Scenario: Member not on a team is redirected away from team forms
    When I open "/team-forms"
    Then I am redirected to "/"                                                        # confirmed: app/(member)/team-forms/layout.tsx

  # --- Secuela ---------------------------------------------------------------------------------------

  @E0-MEMBER-040 @unit-6
  Scenario: Member confirms secuela attendance for the active group
    Given an ACTIVE weekend group with a secuela date
    When I open "/secuela-confirm"
    Then my own weekend group member row is created or updated with the attendance time  # FR-6.3 own-row clause
    And I see a confirmation

  @E0-MEMBER-041 @unit-6 @security
  Scenario: Member cannot mark secuela attendance for someone else
    Given another user exists
    When I request "POST /rest/v1/weekend_group_members" with my session for the other user's id
    Then the response is a permission error

  # --- Fees -----------------------------------------------------------------------------------------

  @E0-MEMBER-050 @team-member
  Scenario: Team member sees their own fee status
    Given I am signed in as a team member on the active weekend with an unpaid team fee
    When I open "/payment"
    Then I see my team fee balance

  @E0-MEMBER-051 @team-member
  Scenario: Team member pays their team fee online
    Given I am signed in as a team member on the active weekend with an unpaid team fee
    When I start checkout from "/payment/team-fee"
    Then I am redirected to Stripe Checkout
    When Stripe completes the test payment and sends the webhook
    Then my team fee shows as paid on "/payment"
    And I land on the team fee success page

  @E0-MEMBER-052 @team-member @security
  Scenario: Team member cannot start a team-fee checkout for someone else
    Given another team member with an unpaid team fee
    When I invoke "beginCheckout" for the other member's team fee
    Then the result is "Unauthorized"                                                  # existing ownership check kept

  @E0-MEMBER-053 @unit-4 @security
  Scenario Outline: Member cannot record manual payments
    When I invoke the server action "<action>" with a valid target
    Then the result is "Unauthorized"
    And no payment transaction is created                                              # FR-4.4

    Examples:
      | action                        |
      | recordManualPayment           |
      | recordManualCandidatePayment  |

  @E0-MEMBER-054 @unit-6 @api @security
  Scenario: Member cannot insert a payment transaction directly
    When I request "POST /rest/v1/payment_transaction" with my session and a valid body
    Then the response is a permission error                                            # FR-6.4

  # --- Roster and roles ---------------------------------------------------------------------------------

  @E0-MEMBER-060 @unit-4 @security
  Scenario: Member cannot open the roster builder
    When I open "/roster-builder"
    Then I am redirected or shown an unauthorized page

  @E0-MEMBER-061 @unit-4 @unit-6 @security
  Scenario Outline: Member cannot add or remove roster rows
    When I invoke the server action "<action>" with valid arguments
    Then the result is "Unauthorized"                                                  # FR-4.3

    Examples:
      | action                        |
      | addDraftRosterMember          |
      | removeDraftRosterMember       |
      | finalizeDraftRosterMember     |
      | dropFinalizedRosterMember     |
      | removeFinalizedRosterMember   |
      | addUserToWeekendRoster        |
      | updateWeekendRosterMember     |

  @E0-MEMBER-062 @unit-6 @api @security
  Scenario Outline: Member cannot place anyone on a roster directly
    When I request "POST /rest/v1/<table>" with my session and a valid body
    Then the response is a permission error                                            # FR-6.3

    Examples:
      | table                 |
      | weekend_roster        |
      | draft_weekend_roster  |

  @E0-MEMBER-063 @unit-1 @api @security
  Scenario: Member cannot grant themselves a role
    When I request "POST /rest/v1/user_roles" with my session for my own id and the "Full Access" role
    Then the response is a permission error                                            # FR-1.2
    And I still have no roles

  @E0-MEMBER-064 @unit-1 @api @security
  Scenario: Member cannot edit a role's permissions
    When I request "PATCH /rest/v1/roles?label=eq.Treasurer" with my session adding FULL_ACCESS
    Then zero rows are updated                                                          # FR-1.1

  @E0-MEMBER-065 @unit-4 @security
  Scenario: Member cannot call role management actions
    When I invoke the server action "updateUserRoles" for my own id
    Then the result is "Unauthorized"

  # --- Files and storage --------------------------------------------------------------------------------

  @E0-MEMBER-070 @unit-1 @security
  Scenario: Member cannot upload into the files bucket directly
    When I upload an object to bucket "files" with my session through the storage API
    Then the upload is rejected                                                         # FR-1.7

  @E0-MEMBER-071 @unit-1 @security
  Scenario: Member cannot delete from the files bucket directly
    Given a file exists in the "files" bucket
    When I delete that object with my session through the storage API
    Then the delete is rejected
    And the file still exists

  @E0-MEMBER-072 @unit-1 @security
  Scenario: Member cannot create or delete buckets
    When I create a bucket named "scratch" with my session
    Then the request is rejected                                                        # FR-1.8
    When I delete the bucket "files" with my session
    Then the request is rejected

  @E0-MEMBER-073 @unit-4 @security
  Scenario: Member cannot use the file management actions
    When I invoke the server action "createUploadUrlAction" for bucket "files"
    Then the result is "Unauthorized"
    When I invoke the server action "deleteFileAction" for an existing file
    Then the result is "Unauthorized"

  @E0-MEMBER-074 @unit-7 @security
  Scenario Outline: Download route rejects unknown buckets and path traversal
    When I request "/api/files/download?bucket=<bucket>&path=<path>" with my session
    Then the response status is <status>                                                # FR-7.4

    Examples:
      | bucket   | path                 | status |
      | secrets  | any.pdf              | 400    |
      | files    | ../../etc/passwd     | 400    |
      | files    | minutes/../other.pdf | 400    |
      | files    | /minutes/2026.pdf    | 400    |
      | files    | minutes\\2026.pdf    | 400    |
      | files    |                      | 400    |
      | files    | minutes/2026.pdf     | 200    |
      | avatars  | <my user id>.webp    | 200    |
    # confirmed: lib/storage-path.ts normalizeStoragePath; ALLOWED_BUCKETS = files, avatars

  # --- Events and encouragement ---------------------------------------------------------------------------

  @E0-MEMBER-080 @unit-4 @unit-6 @security
  Scenario Outline: Member cannot write events
    When I invoke the server action "<action>" with valid arguments
    Then the result is "Unauthorized"                                                   # FR-4.2

    Examples:
      | action       |
      | createEvent  |
      | updateEvent  |
      | deleteEvent  |

  @E0-MEMBER-081 @unit-6 @api @security
  Scenario: Member cannot change community encouragement directly
    When I request "PATCH /rest/v1/community_encouragements" with my session
    Then zero rows are updated                                                           # FR-6.7
