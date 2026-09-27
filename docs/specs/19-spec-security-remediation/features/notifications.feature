@regression
Feature: Notifications
  Every email the candidate and payment flows send keeps going out, including two that were silently
  failing before Epic 0, and none can be triggered by an anonymous caller. Covers FR-4.1, FR-4.8,
  FR-5.4, FR-5.6 and the demotion of notification helpers in FR-3.5/3.7.

  Background:
    Given the Pre-Weekend Couple email is configured in contact information
    And outgoing email is captured

  @E0-NOTIF-001 @member @unit-4
  Scenario: Sponsorship notification is sent when a member sponsors a candidate
    Given I am signed in as a member with no roles
    When I submit the sponsor form for a new candidate
    Then an email "New candidate sponsored" is sent to the Pre-Weekend Couple
    And the send is recorded in the email log without its body
    # assumption: subject wording

  @E0-NOTIF-002 @pwc @unit-4
  Scenario: Candidate forms email goes to the candidate
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "sponsored"
    When I send the candidate forms
    Then an email with the forms link is sent to the candidate's email address
    And the link opens the candidate forms page for that candidate

  @E0-NOTIF-003 @anonymous @unit-5 @fixed-bug
  Scenario: Forms-completed email reaches the Pre-Weekend Couple
    Given a candidate in status "awaiting_forms"
    When the candidate submits their forms while logged out
    Then an email "Candidate forms completed" is sent to the Pre-Weekend Couple               # FR-5.4, previously failed on contact_information
    And the email links to the candidate's review page for the right weekend

  @E0-NOTIF-004 @pwc @unit-4
  Scenario: Payment request email goes to the payment owner
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "pending_approval"
    When I approve the candidate with the sponsor as payment owner
    Then an email with the candidate fee link is sent to the sponsor's email
    And the link opens the candidate fee page for that candidate

  @E0-NOTIF-005 @anonymous @unit-5
  Scenario: Payment-received email after an online candidate payment
    Given a candidate in status "awaiting_payment"
    When the candidate fee is paid through Stripe and the webhook is processed
    Then an email "Payment received" is sent to the Pre-Weekend Couple                       # notifyCandidatePaymentReceivedAdmin, now server-only

  @E0-NOTIF-006 @pwc @unit-4
  Scenario: Payment-received email after a manual candidate payment
    Given I am signed in as a Pre-Weekend Couple member
    And a candidate in status "awaiting_payment"
    When I record a check payment for the candidate
    Then an email "Payment received" is sent to the Pre-Weekend Couple

  @E0-NOTIF-007 @team-member @unit-5 @fixed-bug
  Scenario: Assistant Head is emailed when a team member pays online
    Given an Assistant Head Cha is on the active Men's weekend roster
    And I am signed in as a team member on that weekend with an unpaid team fee
    When I pay my team fee through Stripe and the webhook is processed
    Then an email is sent to the Assistant Head about my payment                              # FR-5.6, previously failed on weekend_roster read

  @E0-NOTIF-008 @anonymous
  Scenario: Password reset email is sent from the system address
    When an anonymous visitor requests a password reset for an existing account
    Then a reset email is sent to that address
    And the send is recorded in the email log

  @E0-NOTIF-009 @full-access
  Scenario: Monthly email count is visible to Full Access
    Given I am signed in as the Full Access owner
    When I open "/admin/settings"
    Then I see how many emails were sent this month                                           # email_log FULL_ACCESS read

  # --- Closed doors ---------------------------------------------------------------------------------------------------------------

  @E0-NOTIF-010 @anonymous @unit-3 @api @security
  Scenario: Anonymous callers cannot trigger a forged payment-received email
    When I invoke the former server action "notifyCandidatePaymentReceivedAdmin" without a session
    Then no such server action exists                                                          # FR-3.5 demoted
    And no email is sent

  @E0-NOTIF-011 @anonymous @unit-4 @api @security
  Scenario Outline: Anonymous callers cannot send candidate or payment emails
    When I invoke the server action "<action>" without a session
    Then the result is "Unauthorized"
    And no email is sent

    Examples:
      | action                            |
      | sendCandidateForms                |
      | sendPaymentRequestEmail           |
      | sendSponsorshipNotificationEmail  |

  @E0-NOTIF-012 @member @unit-4 @security
  Scenario: A member cannot send a payment request for a candidate
    Given I am signed in as a member with no roles
    When I invoke the server action "sendPaymentRequestEmail" for a candidate
    Then the result is "Unauthorized"
    And the candidate's status is unchanged
    And no email is sent

  @E0-NOTIF-013 @anonymous @unit-5 @security
  Scenario: The forms-completed email cannot be triggered without a real submission
    Given a candidate in status "pending_approval" whose forms are complete
    When the forms submission is replayed for that candidate
    Then no additional email is sent to the Pre-Weekend Couple

  @E0-NOTIF-014 @anonymous @unit-5 @security
  Scenario: The open relay is closed
    Given I am an anonymous visitor
    When I try to create a candidate with an arbitrary email address through the sponsor action
    Then the result is "Unauthorized"                                                            # FR-4.8 createCandidateWithSponsorshipInfo requires a session
    And no email is sent to that address
