#!/bin/bash

# List of pages that need sidebar (authenticated pages only)
pages=(
  "ExpertsPage"
  "ChatListPage"
  "ChatPage"
  "ProfilePage"
  "ProfessionalAvailabilityPage"
  "AppointmentInboxPage"
  "BookAppointmentPage"
  "PatientAppointmentsPage"
  "DealsPage"
  "RapidAlertPage"
  "RapidAlertInboxPage"
  "CompanyDashboardPage"
  "CompanyEmployeesPage"
)

echo "Pages to update with Sidebar:"
for page in "${pages[@]}"; do
  echo "  - $page"
done

