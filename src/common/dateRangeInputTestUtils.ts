import { format, parse } from "date-fns";
import * as Locales from "date-fns/locale";

import { type DateFormatProps } from "@blueprintjs/datetime";

export function getDateFnsFormatter(formatStr: string): DateFormatProps {
    return {
        formatDate: (date, localeCode) => format(date, formatStr, maybeGetDateFnsLocaleOptions(localeCode)),
        parseDate: (str, localeCode) => parse(str, formatStr, new Date(), maybeGetDateFnsLocaleOptions(localeCode)),
        placeholder: `${formatStr}`,
    };
}

const AllLocales: Record<string, Locale> = Locales;

function maybeGetDateFnsLocaleOptions(localeCode: string | undefined): { locale: Locale } | undefined {
    if (localeCode !== undefined && AllLocales[localeCode] !== undefined) {
        return { locale: AllLocales[localeCode] };
    }
    return undefined;
}
