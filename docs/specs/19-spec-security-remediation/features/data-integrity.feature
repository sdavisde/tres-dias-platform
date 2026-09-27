@api @regression
Feature: Row-level security matrix
  What each persona can do against each table through the REST API, independent of the app. This is
  the database half of the remediation: Units 1, 5 and 6 (FR-1.x, FR-5.7, FR-6.x).
  "allowed" means the request succeeds; "denied" means a permission error or zero affected rows.
  For the anonymous key "denied" is always a PostgREST 42501 permission error, because anon holds no
  table grants after Units 1 and 5 (it keeps only USAGE on the schema).

  @E0-RLS-001 @unit-1 @unit-5 @security
  Scenario Outline: Anonymous key
    Given I hold only the publishable key
    When I attempt <command> on "<table>"
    Then the result is <outcome>

    Examples:
      | table                       | command | outcome |
      | users                       | SELECT  | denied  |
      | users                       | UPDATE  | denied  |
      | roles                       | SELECT  | denied  |
      | roles                       | INSERT  | denied  |
      | user_roles                  | SELECT  | denied  |
      | user_roles                  | INSERT  | denied  |
      | candidates                  | SELECT  | denied  |
      | candidates                  | INSERT  | denied  |
      | candidates                  | UPDATE  | denied  |
      | candidate_info              | SELECT  | denied  |
      | candidate_info              | INSERT  | denied  |
      | candidate_sponsorship_info  | SELECT  | denied  |
      | weekend_roster              | SELECT  | denied  |
      | payment_transaction         | SELECT  | denied  |
      | events                      | SELECT  | denied  |
      | community_encouragements    | SELECT  | denied  |
      | site_settings               | SELECT  | denied  |
      | email_log                   | SELECT  | denied  |
      | storage.objects (files)     | SELECT  | denied  |
      | storage.objects (avatars)   | SELECT  | allowed |

  @E0-RLS-002 @member @unit-1 @unit-6
  Scenario Outline: Member with no roles — reads stay open, writes are own-row only
    Given I am signed in as a member with no roles
    When I attempt <command> on "<table>" <target>
    Then the result is <outcome>

    Examples:
      | table                       | command | target                    | outcome |
      | users                       | SELECT  | any row                   | allowed |
      | users                       | UPDATE  | own row                   | allowed |
      | users                       | UPDATE  | another user's row        | denied  |
      | users                       | DELETE  | any row                   | denied  |
      | users                       | INSERT  | new row                   | denied  |
      | roles                       | SELECT  | any row                   | allowed |
      | roles                       | INSERT  | new row                   | denied  |
      | roles                       | UPDATE  | any row                   | denied  |
      | roles                       | DELETE  | any row                   | denied  |
      | user_roles                  | SELECT  | any row                   | allowed |
      | user_roles                  | INSERT  | own id, any role          | denied  |
      | user_roles                  | DELETE  | any row                   | denied  |
      | candidates                  | SELECT  | any row                   | allowed |
      | candidates                  | INSERT  | new row                   | allowed |
      | candidates                  | UPDATE  | any row                   | denied  |
      | candidates                  | DELETE  | any row                   | denied  |
      | candidate_info              | SELECT  | any row                   | allowed |
      | candidate_info              | INSERT  | new row                   | allowed |
      | candidate_info              | UPDATE  | any row                   | denied  |
      | candidate_sponsorship_info  | INSERT  | new row                   | allowed |
      | candidate_sponsorship_info  | UPDATE  | any row                   | denied  |
      | weekend_roster              | SELECT  | any row                   | allowed |
      | weekend_roster              | INSERT  | new row                   | denied  |
      | weekend_roster              | UPDATE  | any row                   | denied  |
      | weekend_roster              | DELETE  | any row                   | denied  |
      | draft_weekend_roster        | SELECT  | any row                   | allowed |
      | draft_weekend_roster        | INSERT  | new row                   | denied  |
      | weekend_group_members       | SELECT  | any row                   | allowed |
      | weekend_group_members       | INSERT  | own user id               | allowed |
      | weekend_group_members       | INSERT  | another user id           | denied  |
      | weekend_group_members       | UPDATE  | own row                   | allowed |
      | weekend_group_members       | UPDATE  | another member's row      | denied  |
      | weekend_group_members       | DELETE  | any row                   | denied  |
      | team_form_completions       | INSERT  | own group member id       | allowed |
      | team_form_completions       | INSERT  | another group member id   | denied  |
      | team_form_completions       | UPDATE  | own group member row      | allowed |
      | users_experience            | INSERT  | own user id               | allowed |
      | users_experience            | INSERT  | another user id           | denied  |
      | users_experience            | UPDATE  | own row                   | allowed |
      | users_experience            | DELETE  | own row                   | allowed |
      | users_experience            | DELETE  | another user's row        | denied  |
      | user_medical_profiles       | SELECT  | own row                   | allowed |
      | user_medical_profiles       | SELECT  | another user's row        | denied  |
      | payment_transaction         | SELECT  | any row                   | allowed |
      | payment_transaction         | INSERT  | new row                   | denied  |
      | payment_transaction         | UPDATE  | any row                   | denied  |
      | deposits                    | SELECT  | any row                   | allowed |
      | deposits                    | INSERT  | new row                   | denied  |
      | weekends                    | SELECT  | any row                   | allowed |
      | weekends                    | INSERT  | new row                   | denied  |
      | weekends                    | UPDATE  | any row                   | denied  |
      | weekend_groups              | UPDATE  | any row                   | denied  |
      | events                      | SELECT  | any row                   | allowed |
      | events                      | INSERT  | new row                   | denied  |
      | site_settings               | SELECT  | any row                   | allowed |
      | site_settings               | UPDATE  | any key                   | denied  |
      | community_encouragements    | UPDATE  | any row                   | denied  |
      | contact_information         | SELECT  | any row                   | allowed |
      | contact_information         | UPDATE  | any row                   | denied  |
      | meeting_minutes_metadata    | SELECT  | any row                   | allowed |
      | meeting_minutes_metadata    | INSERT  | new row                   | denied  |
      | email_log                   | SELECT  | any row                   | denied  |
      | storage.objects (files)     | SELECT  | any object                | allowed |
      | storage.objects (files)     | INSERT  | new object                | denied  |
      | storage.objects (files)     | DELETE  | any object                | denied  |
      | storage.objects (avatars)   | INSERT  | <own id>.webp             | allowed |
      | storage.objects (avatars)   | INSERT  | <other id>.webp           | denied  |
      | storage.objects (avatars)   | DELETE  | <own id>.webp             | allowed |
      | storage.buckets             | SELECT  | any                       | allowed |
      | storage.buckets             | INSERT  | new bucket                | denied  |
      | storage.buckets             | DELETE  | any bucket                | denied  |

  @E0-RLS-003 @rector @unit-6
  Scenario Outline: Rector by CHA only (active weekend, no DB roles)
    Given I am signed in as the Rector of the active weekend
    And I hold no database roles
    When I attempt <command> on "<table>" <target>
    Then the result is <outcome>

    Examples:
      | table                 | command | target                                       | outcome |
      | weekend_roster        | INSERT  | new row                                      | allowed |
      | weekend_roster        | UPDATE  | any row                                      | allowed |
      | weekend_roster        | DELETE  | any row                                      | allowed |
      | draft_weekend_roster  | INSERT  | new row                                      | allowed |
      | draft_weekend_roster  | DELETE  | any row                                      | allowed |
      | weekend_group_members | INSERT  | another user id                              | allowed |
      | weekend_group_members | DELETE  | any row                                      | allowed |
      | payment_transaction   | INSERT  | weekend_group_member target, method cash     | allowed |
      | payment_transaction   | INSERT  | weekend_group_member target, method check    | allowed |
      | payment_transaction   | INSERT  | candidate target, method cash                | denied  |
      | payment_transaction   | INSERT  | weekend_group_member target, method waived   | denied  |
      | payment_transaction   | UPDATE  | any row                                      | denied  |
      | candidates            | UPDATE  | any row                                      | denied  |
      | roles                 | UPDATE  | any row                                      | denied  |
      | user_roles            | INSERT  | own id, any role                             | denied  |
      | events                | INSERT  | new row                                      | denied  |
      | weekends              | UPDATE  | any row                                      | denied  |

  @E0-RLS-004 @rector @unit-6 @security
  Scenario Outline: Rector of a weekend that is no longer active has no CHA-derived rights
    Given I was the Rector of a COMPLETED weekend group
    And I hold no database roles
    When I attempt <command> on "<table>"
    Then the result is denied

    Examples:
      | table                 | command |
      | weekend_roster        | INSERT  |
      | draft_weekend_roster  | INSERT  |
      | payment_transaction   | INSERT  |

  @E0-RLS-005 @pwc @unit-6
  Scenario Outline: Pre-Weekend Couple
    Given I am signed in as a Pre-Weekend Couple member
    When I attempt <command> on "<table>" <target>
    Then the result is <outcome>

    Examples:
      | table                       | command | target                          | outcome |
      | candidates                  | UPDATE  | any row                         | allowed |
      | candidates                  | DELETE  | any row                         | allowed |
      | candidate_info              | UPDATE  | any row                         | allowed |
      | candidate_info              | DELETE  | any row                         | allowed |
      | candidate_sponsorship_info  | UPDATE  | any row                         | allowed |
      | payment_transaction         | INSERT  | candidate target, method check  | allowed |
      | payment_transaction         | UPDATE  | any row                         | allowed |
      | weekend_roster              | INSERT  | new row                         | denied  |
      | roles                       | UPDATE  | any row                         | denied  |
      | events                      | INSERT  | new row                         | denied  |

  @E0-RLS-006 @treasurer @unit-6
  Scenario Outline: Treasurer
    Given I am signed in as the Treasurer
    When I attempt <command> on "<table>" <target>
    Then the result is <outcome>

    Examples:
      | table                 | command | target                                   | outcome |
      | payment_transaction   | INSERT  | candidate target, method cash            | allowed |
      | payment_transaction   | INSERT  | weekend_group_member target, method cash | allowed |
      | payment_transaction   | INSERT  | any target, method waived                | allowed |
      | payment_transaction   | UPDATE  | any row                                  | allowed |
      | payment_transaction   | DELETE  | any row                                  | allowed |
      | weekend_group_fee_changes | SELECT | any row                                | allowed |
      | weekend_roster        | INSERT  | new row                                  | denied  |
      | candidates            | UPDATE  | any row                                  | denied  |

  @E0-RLS-007 @leaders @unit-1 @unit-6
  Scenario Outline: Leaders Committee
    Given I am signed in as a Leaders Committee member
    When I attempt <command> on "<table>" <target>
    Then the result is <outcome>

    Examples:
      | table                     | command | target             | outcome |
      | roles                     | INSERT  | new row            | allowed |
      | roles                     | UPDATE  | any row            | allowed |
      | roles                     | DELETE  | unused role        | allowed |
      | user_roles                | INSERT  | any user, any role | allowed |
      | user_roles                | DELETE  | any row            | allowed |
      | users                     | UPDATE  | another user's row | denied  |
      | users                     | DELETE  | any row            | denied  |
      | weekend_roster            | INSERT  | new row            | allowed |
      | weekends                  | INSERT  | new row            | allowed |
      | weekends                  | UPDATE  | any row            | allowed |
      | weekends                  | DELETE  | any row            | allowed |
      | weekend_groups            | INSERT  | new row            | allowed |
      | weekend_groups            | UPDATE  | non-fee columns    | allowed |
      | weekend_groups            | UPDATE  | fee columns        | denied  |
      | weekend_groups            | DELETE  | any row            | allowed |
      | events                    | INSERT  | new row            | allowed |
      | events                    | UPDATE  | any row            | allowed |
      | events                    | DELETE  | any row            | allowed |
      | site_settings             | UPDATE  | non-fee key        | allowed |
      | site_settings             | UPDATE  | fee default key    | denied  |
      | contact_information       | UPDATE  | any row            | allowed |
      | meeting_minutes_metadata  | INSERT  | new row            | allowed |
      | meeting_minutes_metadata  | DELETE  | any row            | allowed |
      | users_experience          | INSERT  | another user id    | allowed |
      | storage.objects (files)   | INSERT  | new object         | allowed |
      | storage.objects (files)   | DELETE  | any object         | allowed |
      | payment_transaction       | INSERT  | any target         | allowed |
    # note: Leaders Committee lacks MANAGE_FEES in prod, hence the fee-column denials

  @E0-RLS-008 @admin @unit-1 @unit-6
  Scenario Outline: Admin role (no FULL_ACCESS)
    Given I am signed in as an Admin
    When I attempt <command> on "<table>" <target>
    Then the result is <outcome>

    Examples:
      | table                     | command | target             | outcome |
      | roles                     | UPDATE  | any row            | denied  |
      | user_roles                | INSERT  | any                | denied  |
      | users                     | UPDATE  | another user's row | denied  |
      | site_settings             | UPDATE  | non-fee key        | allowed |
      | site_settings             | UPDATE  | fee default key    | denied  |
      | storage.objects (files)   | INSERT  | new object         | allowed |
      | storage.objects (files)   | DELETE  | any object         | allowed |
      | meeting_minutes_metadata  | INSERT  | new row            | allowed |
      | events                    | INSERT  | new row            | denied  |
      | weekend_roster            | INSERT  | new row            | denied  |
      | candidates                | UPDATE  | any row            | denied  |

  @E0-RLS-009 @full-access @unit-1 @unit-6
  Scenario Outline: Full Access owner
    Given I am signed in as the Full Access owner
    When I attempt <command> on "<table>" <target>
    Then the result is allowed

    Examples:
      | table                 | command | target             |
      | users                 | UPDATE  | another user's row |
      | users                 | DELETE  | a test user        |
      | roles                 | UPDATE  | any row            |
      | user_roles            | INSERT  | any                |
      | weekend_roster        | INSERT  | new row            |
      | payment_transaction   | INSERT  | any target         |
      | candidates            | UPDATE  | any row            |
      | team_form_completions | INSERT  | another member     |
      | users_experience      | DELETE  | another user's row |
      | user_medical_profiles | SELECT  | any row            |
      | email_log             | SELECT  | any row            |

  @E0-RLS-010 @unit-6
  Scenario: Inherited permissions satisfy the database helper
    Given a role "Junior Leaders" based on "Leaders Committee" with no permissions of its own
    And I am signed in as a user holding only "Junior Leaders"
    When I attempt INSERT on "events"
    Then the result is allowed                                                                  # FR-6.1

  @E0-RLS-011 @unit-6
  Scenario: The CHA helper's role lists match the TypeScript map
    When the test compares auth_user_cha_has_permission's role arrays with CHA_ROLE_PERMISSIONS
    Then WRITE_TEAM_ROSTER and READ_WRITE_TEAM_PAYMENTS map to the same CHA roles in both              # FR-6.2

  @E0-RLS-012 @unit-1 @security
  Scenario: New tables do not inherit anon grants
    Given a migration creates a new table in schema public without explicit grants
    When I inspect its privileges
    Then anon holds no privileges on it                                                             # FR-1.6 default privileges

  @E0-RLS-013 @unit-1 @unit-5 @security
  Scenario: Anon retains only schema usage after Unit 5
    When I inspect anon's privileges in schema public
    Then anon holds USAGE on the schema and nothing on any table, sequence or function              # FR-5.7

  @E0-RLS-014 @unit-5 @security
  Scenario: Service paths are unaffected by anon revocation
    When the Stripe webhook, the checkout quote, the settings read for emails and the email log write run
    Then each succeeds through the admin client                                                    # spec §5 of the anon flow map
