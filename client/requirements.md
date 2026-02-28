## Packages
@tanstack/react-table | For the complex data table with many columns
clsx | Utility for conditional class names (often paired with tailwind-merge)
date-fns | Date formatting and manipulation for payment schedules
lucide-react | Icons (already in stack but confirming usage)
framer-motion | Smooth animations for rows and dialogs

## Notes
The application tracks sales and payments with a complex monthly schedule (July 2025 - Jan 2028).
Data table requires horizontal scrolling due to the large number of columns.
Currency formatting should be in TND (Tunisian Dinar) or generic format as requested (DT).
Carte Grise status has specific color coding: Red (A Déposer), Green (Récupérée), Orange (Impôt), Purple (En cours).
Payment cells need to handle amount (number) and status (paid/unpaid).
