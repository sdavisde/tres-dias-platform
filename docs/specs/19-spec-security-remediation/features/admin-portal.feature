@admin @regression
Feature: Admin portal
  Admin pages open for the permissions their nav items require, and every write still works for the
  role that owns it. Covers FR-1.1 to FR-1.3, FR-1.7, FR-4.2, FR-4.5, FR-6.6 to FR-6.8.

  # --- Navigation by permission ------------------------------------------------------------------------------

  @E0-ADMIN-001
  Scenario: Admin opens the portal
    Given I am signed in as an Admin
    When I open "/admin"
    Then I see the admin dashboard with metrics and upcoming events

  @E0-ADMIN-002
  Scenario Outline: Admin pages open for the permissions the Admin role holds
    Given I am signed in as an Admin
    When I open "<path>"
    Then the page renders

    Examples:
      | path                    |
      | /admin                  |
      | /admin/weekends         |
      | /admin/people           |
      | /admin/files            |
      | /admin/settings         |
      | /admin/community-board  |

  @E0-ADMIN-003 @security
  Scenario Outline: Admin pages redirect when the permission is missing
    Given I am signed in as an Admin
    When I open "<path>"
    Then I am redirected to "<lands on>"

    Examples:
      | path               | missing permission | lands on         |
      | /admin/payments    | READ_PAYMENTS      | /admin           |
      | /admin/events      | READ_EVENTS        | /?error=<reason> |
      | /admin/security    | READ_USER_ROLES    | /?error=<reason> |
    # confirmed: app/admin/payments/page.tsx redirects to /admin; events uses permissionLock,
    # security uses guardAdminPage; both redirect to /?error=…

  @E0-ADMIN-004 @member @security
  Scenario: A member without READ_ADMIN_PORTAL cannot enter the admin portal
    Given I am signed in as a member with no roles
    When I open "/admin"
    Then I am redirected away from the admin portal

  @E0-ADMIN-005 @treasurer
  Scenario: Treasurer without READ_ADMIN_PORTAL cannot reach admin payments today
    Given I am signed in as the Treasurer
    When I open "/admin/payments"
    Then I am redirected away from the admin portal
    # note: live Treasurer role lacks READ_ADMIN_PORTAL; not changed by Epic 0

  # --- Events ----------------------------------------------------------------------------------------------------

  @E0-ADMIN-010 @leaders @unit-4 @unit-6
  Scenario: Event editor creates, updates and deletes an event
    Given I am signed in as a Leaders Committee member
    When I open "/admin/events" and create an event "Secuela" for the active group
    Then the event appears in the list                                                       # FR-4.2, FR-6.7
    When I change its date
    Then the new date is shown
    When I delete the event
    Then it is gone

  @E0-ADMIN-011 @leaders
  Scenario: Past events section loads
    Given I am signed in as a Leaders Committee member
    When I open "/admin/events" and expand past events
    Then I see past events                                                                    # getPastEvents 'authenticated'

  @E0-ADMIN-012 @unit-6 @api @security
  Scenario: READ_EVENTS without WRITE_EVENTS cannot write events directly
    Given I am signed in as a user with only READ_EVENTS and READ_ADMIN_PORTAL
    When I request "POST /rest/v1/events" with my session
    Then the response is a permission error

  # --- Weekends ---------------------------------------------------------------------------------------------------

  @E0-ADMIN-020 @leaders @unit-6
  Scenario: Create a weekend group with fees
    Given I am signed in as a Leaders Committee member
    When I open "/admin/weekends" and create group number 14 with a weekend fee
    Then the group appears in planning with a Men's and a Women's weekend                    # FR-6.6 WRITE_WEEKENDS

  @E0-ADMIN-021 @leaders @unit-6
  Scenario: Activate a weekend group
    Given I am signed in as a Leaders Committee member
    And a PLANNING weekend group whose previous group is ACTIVE
    When I activate the planning group
    Then it becomes the active group
    And service history rows are created for the previous group's roster members             # FR-6.8 WRITE_WEEKENDS clause on users_experience

  @E0-ADMIN-022 @leaders @unit-6 @fixed-bug
  Scenario: Delete a weekend group actually deletes its weekends
    Given I am signed in as a Leaders Committee member
    And a PLANNING weekend group with no roster or candidates
    When I delete the group
    Then the group is gone
    And its two weekends are gone                                                             # FR-6.6 new DELETE policy

  @E0-ADMIN-023 @leaders
  Scenario: Edit a weekend from the sidebar
    Given I am signed in as a Leaders Committee member
    When I change the Men's weekend dates from the weekend sidebar
    Then the new dates auto-save

  @E0-ADMIN-024 @leaders @unit-6
  Scenario: Change a group's fee with MANAGE_FEES
    Given I am signed in as a user with MANAGE_FEES and READ_ADMIN_PORTAL
    When I change the weekend fee for the active group
    Then a fee change is logged with old and new values                                      # FR-6.6 UPDATE via MANAGE_FEES

  # --- Payments ----------------------------------------------------------------------------------------------------

  @E0-ADMIN-030 @leaders @unit-6
  Scenario: Record an admin payment
    Given I am signed in as a Leaders Committee member
    And a team member owes a fee
    When I open "/admin/payments" and record a cash payment for that member
    Then the payment appears in the ledger                                                    # FR-6.4 WRITE_PAYMENTS

  @E0-ADMIN-031 @leaders
  Scenario: Void and reassign payments
    Given I am signed in as a Leaders Committee member
    And a recorded payment exists
    When I void it
    Then it shows as voided
    When I reassign a different payment to another member
    Then the ledger reflects the new owner

  @E0-ADMIN-032 @leaders
  Scenario: Payment summary page renders
    Given I am signed in as a Leaders Committee member
    When I open "/admin/payments/summary"
    Then I see outstanding and collected totals                                               # getActiveWeekendFinancials demoted

  @E0-ADMIN-033 @leaders
  Scenario: Deposits are visible but not editable in the app
    Given I am signed in as a Leaders Committee member
    When I open the deposits view on "/admin/payments"
    Then I see deposits recorded by the payout webhook                                         # FR-6.4 deposits webhook-only

  # --- People and roles ---------------------------------------------------------------------------------------------

  @E0-ADMIN-040 @full-access @unit-1 @unit-4
  Scenario: People editor edits a member's contact info, address, roles and experience
    Given I am signed in as the Full Access owner
    When I open "/admin/people" and edit a member
    And I change their phone, address and name
    And I add them to the "Treasurer" role
    And I add a service history entry
    Then every change persists after reload                                                   # FR-4.5, FR-4.7, FR-1.2

  @E0-ADMIN-041 @leaders @unit-1
  Scenario: WRITE_USER_ROLES holder edits roles and memberships in security
    Given I am signed in as a Leaders Committee member
    When I open "/admin/security" and create a role "Kitchen" with FILES_UPLOAD
    Then the role exists                                                                        # FR-1.1
    When I add a member to "Kitchen"
    Then they hold the role                                                                     # FR-1.2
    When I remove them and delete the role
    Then both are gone

  @E0-ADMIN-042 @leaders @unit-1
  Scenario: Role inheritance is edited in the role editor
    Given I am signed in as a Leaders Committee member
    When I base the "Kitchen" role on "Admin"
    Then the effective permissions preview shows Admin's permissions

  @E0-ADMIN-043 @admin @unit-1 @security
  Scenario: Admin without WRITE_USER_ROLES cannot edit roles
    Given I am signed in as an Admin
    When I invoke the server action "updateRole" for the "Treasurer" role
    Then the result is "Unauthorized"
    When I request "PATCH /rest/v1/roles?label=eq.Treasurer" with my session
    Then zero rows are updated                                                                  # FR-1.1

  @E0-ADMIN-044 @admin @unit-4 @security
  Scenario: Admin without FULL_ACCESS cannot edit another member's contact info
    Given I am signed in as an Admin
    When I invoke the server action "updateUserContactInfo" for another user
    Then the result is "Unauthorized"                                                            # FR-4.5

  @E0-ADMIN-045 @admin @unit-4 @security
  Scenario: Admin without FULL_ACCESS cannot list all users through the impersonation action
    Given I am signed in as an Admin
    When I invoke the server action "getAllUsers"
    Then the result is "Unauthorized"                                                            # FR-4.5 canImpersonate

  @E0-ADMIN-046 @full-access @unit-1
  Scenario: Full Access owner can update any user's row
    Given I am signed in as the Full Access owner
    When I edit another member's name in the people editor
    Then the change persists                                                                     # FR-1.3 FULL_ACCESS clause

  # --- Community board and contact information ---------------------------------------------------------------------------

  @E0-ADMIN-050 @unit-6
  Scenario: Community spiritual director updates the encouragement
    Given I am signed in as a user with WRITE_COMMUNITY_ENCOURAGEMENT and READ_ADMIN_PORTAL
    When I open "/admin/community-board" and update the encouragement text
    Then the member home shows the new text                                                       # FR-6.7
    # note: the page's edit gate is WRITE_USER_ROLES while the action checks WRITE_COMMUNITY_ENCOURAGEMENT
    # (spec: Known Bugs, surfaced); verify which one the UI honours

  @E0-ADMIN-051 @leaders @unit-6
  Scenario: Update contact information
    Given I am signed in as a Leaders Committee member
    When I update the Pre-Weekend Couple email in contact information
    Then notifications go to the new address                                                       # FR-6.7 WRITE_USER_ROLES

  @E0-ADMIN-052 @admin
  Scenario: Meeting minutes list opens files
    Given I am signed in as an Admin
    And meeting minutes exist
    When I open "/admin/community-board" and click a minutes entry
    Then the file opens or downloads                                                               # getFileDownloadUrlAction 'authenticated'

  # --- Files -------------------------------------------------------------------------------------------------------------

  @E0-ADMIN-060 @admin @unit-1
  Scenario: FILES_UPLOAD holder uploads a file and creates a folder
    Given I am signed in as an Admin
    When I open "/admin/files" and upload "agenda.pdf"
    Then the file appears in the browser                                                            # FR-1.7 files + FILES_UPLOAD
    When I create a folder "2026"
    Then the folder appears

  @E0-ADMIN-061 @admin @unit-1
  Scenario: FILES_DELETE holder deletes a file and a folder
    Given I am signed in as an Admin
    And a file and an empty folder exist
    When I delete both from "/admin/files"
    Then both are gone

  @E0-ADMIN-062 @admin @unit-6
  Scenario: Saving a file as meeting minutes records metadata
    Given I am signed in as an Admin
    When I mark an uploaded file as meeting minutes for a date
    Then it appears in the community board minutes list                                              # FR-6.7 FILES_UPLOAD

  @E0-ADMIN-063 @unit-1 @security
  Scenario: FILES_UPLOAD without FILES_DELETE cannot delete
    Given I am signed in as a user with FILES_UPLOAD and READ_ADMIN_PORTAL only
    When I invoke the server action "deleteFileAction" for an existing file
    Then the result is "Unauthorized"
    When I delete the object directly through the storage API with my session
    Then the delete is rejected                                                                       # FR-1.7

  # --- Settings ----------------------------------------------------------------------------------------------------------

  @E0-ADMIN-070 @admin @unit-6
  Scenario: WRITE_SETTINGS holder edits site settings
    Given I am signed in as an Admin
    When I open "/admin/settings" and change the system email address and a notification toggle
    Then the settings persist                                                                          # FR-6.7

  @E0-ADMIN-071 @admin @unit-6 @security
  Scenario: WRITE_SETTINGS without MANAGE_FEES cannot change fee defaults
    Given I am signed in as an Admin
    When I try to change the default weekend fee
    Then the change is rejected                                                                          # restrictive fee-key policy kept

  # --- Reports ---------------------------------------------------------------------------------------------------------------

  @E0-ADMIN-080 @admin
  Scenario: Reports nav item is marked coming soon
    Given I am signed in as an Admin
    When I look at the admin sidebar
    Then "Reports" is shown as not yet available
