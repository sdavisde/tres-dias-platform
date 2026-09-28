@regression
Feature: Impersonation
  The Full Access owner can act as another member to reproduce what they see; nobody else can, and a
  hand-made cookie never works. Covers FR-2.1 to FR-2.6, FR-4.5 and FR-4.9.

  # --- Owner workflow, unchanged -----------------------------------------------------------------------------------------------

  @E0-IMP-001 @full-access @unit-2
  Scenario: Owner impersonates a member
    Given I am signed in as the Full Access owner
    When I open the impersonation dialog from the account menu
    Then I see the list of users                                                             # getAllUsers via canImpersonate
    When I pick a member with no roles
    Then the site shows that member's name in the header
    And the impersonation cookie is set httpOnly and signed                                   # FR-2.2

  @E0-IMP-002 @full-access @unit-2
  Scenario: Actions run as the impersonated member
    Given I am signed in as the Full Access owner while impersonating a member with no roles
    When I open "/admin"
    Then I am redirected away, because the member lacks READ_ADMIN_PORTAL
    When I open "/profile" and change the phone number
    Then the member's phone number is updated                                                 # ownsUserOrAdmin: auth.uid() is the admin, FULL_ACCESS clause applies

  @E0-IMP-003 @full-access @unit-2
  Scenario: Owner switches to a different user while impersonating
    Given I am signed in as the Full Access owner while impersonating a member with no roles
    When I open the impersonation dialog and pick a different member
    Then the header shows the new member                                                       # getAllUsers allows originalUser FULL_ACCESS

  @E0-IMP-004 @full-access @unit-2
  Scenario: Owner clears impersonation
    Given I am signed in as the Full Access owner while impersonating a member with no roles
    When I choose "Stop impersonating"
    Then the header shows my own name
    And the impersonation cookie is removed                                                    # FR-2.6, FR-4.9 clearImpersonation is auth-only

  @E0-IMP-005 @full-access @unit-2
  Scenario: Impersonating a Rector shows the Rector's tools
    Given I am signed in as the Full Access owner while impersonating the Rector of the active weekend
    When I open "/roster-builder"
    Then I see the draft roster board
    When I finalize a draft member
    Then the roster row exists                                                                   # CHA permissions of the target apply in the app; FULL_ACCESS satisfies RLS

  @E0-IMP-006 @full-access @unit-2
  Scenario: Impersonation records who really acted
    Given I am signed in as the Full Access owner while impersonating a member with no roles
    When the server resolves the logged-in user
    Then it carries the member as the user and me as the original user                          # FR-2.6 for the future audit log

  # --- Closed doors -----------------------------------------------------------------------------------------------------------------

  @E0-IMP-010 @member @unit-2 @security
  Scenario: A member pasting a raw user id into the cookie is not impersonating
    Given I am signed in as a member with no roles
    When I set the impersonation cookie to the Full Access owner's user id
    And I open "/admin"
    Then I am redirected away from the admin portal
    And the header still shows my own name                                                        # FR-2.3 signature check

  @E0-IMP-011 @member @unit-2 @security
  Scenario: A tampered signed cookie is ignored
    Given a validly signed impersonation cookie exists for the owner
    And I am signed in as a member with no roles
    When I set that cookie value with one character of the payload changed
    Then the request proceeds as myself

  @E0-IMP-012 @member @unit-2 @security
  Scenario: A valid cookie presented by a different session is ignored
    Given the Full Access owner created a signed impersonation cookie
    And I am signed in as a member with no roles
    When I present the owner's cookie with my session
    Then the request proceeds as myself                                                             # FR-2.3 session.id === adminUserId

  @E0-IMP-013 @admin @unit-2 @security
  Scenario: A cookie whose admin lost FULL_ACCESS is ignored
    Given the Full Access owner created a signed impersonation cookie
    And the owner's Full Access role membership is then removed
    When the owner opens any page with that cookie
    Then the request proceeds as the owner themself                                                  # FR-2.3 re-verifies FULL_ACCESS

  @E0-IMP-014 @full-access @unit-2 @security
  Scenario: The cookie expires after 24 hours
    Given the Full Access owner created a signed impersonation cookie 25 hours ago
    When the owner opens any page with that cookie
    Then the request proceeds as the owner themself                                                  # FR-2.2 maxAge, FR-2.3 iat check

  @E0-IMP-015 @unit-2 @security
  Scenario: A missing server secret disables impersonation without breaking login
    Given the server is started without IMPERSONATION_COOKIE_SECRET
    When the Full Access owner signs in and opens "/home"
    Then the page renders normally
    When the owner tries to impersonate a member
    Then impersonation does not take effect
    And a single warning is logged                                                                    # FR-2.4

  @E0-IMP-016 @admin @unit-2 @security
  Scenario: An Admin without FULL_ACCESS cannot impersonate
    Given I am signed in as an Admin
    Then I do not see the impersonation option in the account menu
    When I invoke the server action "impersonateUser" for a member
    Then the result is "Unauthorized"

  @E0-IMP-017 @member @unit-2 @security
  Scenario: An invalid cookie is never cleared during render, and never crashes a page
    Given I am signed in as a member with no roles
    When I set the impersonation cookie to garbage
    And I open "/home"
    Then the page renders as myself                                                                   # FR-2.3 no cookie writes during RSC render
