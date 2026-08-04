import { AmountLocale } from "@/lib/formatAmount";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Dispatch, SetStateAction } from "react";

type LanguageSwitcherProps = {
  locale: AmountLocale;
  setLocale: Dispatch<SetStateAction<AmountLocale>>;
};

const LanguageSwitcher = ({ locale, setLocale }: LanguageSwitcherProps) => (
  <ToggleButtonGroup
    value={locale}
    exclusive
    size="small"
    onChange={(_, value) => value && setLocale(value)}
    aria-label="Amount format locale"
  >
    <ToggleButton value="en">EN</ToggleButton>
    <ToggleButton value="lt">LT</ToggleButton>
  </ToggleButtonGroup>
);

export default LanguageSwitcher;
