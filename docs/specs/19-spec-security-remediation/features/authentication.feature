@regression
Feature: Authentication
  Signing up, signing in, changing passwords and following auth links keep working for a mostly 65+
  audience, with the two agreed hardenings: an 8-character minimum for new passwords and validated
  redirects. Covers FR-7.1 to FR-7.3.

  # --- Sign-up and login ---------------------------------------------------------------------------

  @E0-AUTH-001 @anonymous @unit-7
  Scenario: Registering with an 8-character password succeeds
    Given I am an anonymous visitor on "/join"
    When I register with a new email and the password "abcd1234"
    Then I am signed in
    And a users row exists for my account with zero roles                            # signup grants nothing

  @E0-AUTH-002 @anonymous @unit-7
  Scenario: Registering with a 7-character password is rejected before submit
    Given I am an anonymous visitor on "/join"
    When I enter the password "abcd123"
    Then I see the message that passwords must be at least 8 characters               # FR-7.2
    And the form is not submitted
    # assumption: exact wording comes from lib/auth/constants.ts

  @E0-AUTH-003 @anonymous @unit-7
  Scenario: Registering with a 7-character password is rejected by the server too
    Given I am an anonymous visitor
    When I call the Supabase signup endpoint directly with the password "abcd123"
    Then the response is a weak-password error                                        # FR-7.1

  @E0-AUTH-004 @member @unit-7
  Scenario: An existing account with a 6-character password still logs in
    Given an existing user whose password is "abc123"
    When I sign in with that email and password on "/login"
    Then I am signed in and land on the member home page
    And I am not forced to change my password                                          # settled decision: new passwords only

  @E0-AUTH-005 @anonymous
  Scenario: Wrong password shows a friendly error
    Given an existing user
    When I sign in with the wrong password
    Then I see an error message and stay on "/login"

  @E0-AUTH-006 @anonymous
  Scenario: Login honours a same-site redirectTo
    When I open "/login?redirectTo=%2Fsecuela-signin"
    And I sign in with valid credentials
    Then I land on "/secuela-signin"

  @E0-AUTH-007 @member
  Scenario: Registration does not require email confirmation
    Given I just registered on "/join"
    Then I can use the member site immediately without clicking a confirmation email  # settled decision

  # --- Password reset -----------------------------------------------------------------------------

  @E0-AUTH-010 @anonymous
  Scenario: Forgot-password sends a reset email
    Given an existing user
    When I open "/forgot-password" and submit that user's email
    Then I see a confirmation that an email was sent
    And a password reset email is recorded in the email log for that address

  @E0-AUTH-011 @anonymous @unit-7
  Scenario: Reset password form enforces the 8-character minimum
    Given I opened a valid password reset link and landed on "/reset-password"
    When I enter the new password "short7!"
    Then I see the message that passwords must be at least 8 characters               # FR-7.2
    When I enter the new password "longenough8"
    And I submit
    Then my password is changed and I can sign in with "longenough8"

  @E0-AUTH-012 @member
  Scenario: Signed-in member requests a reset from their profile
    Given I am signed in as a member with no roles
    When I open "/profile" and choose to reset my password
    Then I see a confirmation that an email was sent

  @E0-AUTH-013 @member
  Scenario: Changing email requires the current password
    Given I am signed in as a member with no roles
    When I open the change-email dialog on "/profile"
    And I enter a new email with the wrong current password
    Then the change is rejected
    When I enter the new email with the correct current password
    Then I am told to confirm the change by email

  # --- Redirect validation -------------------------------------------------------------------------

  @E0-AUTH-020 @anonymous @unit-7
  Scenario: Auth callback honours a relative next
    Given a valid auth code
    When I open "/auth/callback?code=<code>&next=%2Fprofile"
    Then I land on "/profile"                                                          # FR-7.3

  @E0-AUTH-021 @anonymous @unit-7 @security
  Scenario Outline: Auth callback refuses off-site next values
    Given a valid auth code
    When I open "/auth/callback?code=<code>&next=<next>"
    Then I stay on this site
    And I land on "/"                                                                  # FR-7.3 via validateRedirectUrl
    # assumption: validateRedirectUrl falls back to "/"

    Examples:
      | next                         |
      | https://evil.example         |
      | //evil.example               |
      | https://evil.example/%2Fhome |

  @E0-AUTH-022 @anonymous @unit-7 @security
  Scenario: Confirm route with an invalid token never redirects off-site
    When I open "/auth/confirm?type=email_change&token_hash=bad&next=https://evil.example"
    Then I stay on this site
    And I see the app's auth error page                                                # FR-7.3 error branch

  @E0-AUTH-023 @anonymous @unit-7
  Scenario: Confirm route with a valid token honours a relative next
    Given a valid email-change token
    When I open "/auth/confirm?type=email_change&token_hash=<token>&next=%2Fprofile"
    Then my email change is applied
    And I land on "/profile"

  # --- Session handling -----------------------------------------------------------------------------

  @E0-AUTH-030 @member
  Scenario: Session refresh keeps a member signed in across pages
    Given I am signed in as a member with no roles
    When I navigate between "/home", "/weekends" and "/profile"
    Then I stay signed in on every page

  @E0-AUTH-031 @member
  Scenario: Signing out clears the session
    Given I am signed in as a member with no roles
    When I sign out
    Then opening "/home" redirects me to "/login"
