/* eslint-disable @typescript-eslint/no-unused-expressions */

import { Classes as CoreClasses, InputGroupProps } from "@blueprintjs/core";
import { DateRange, DateRangeInput3, Months, TimePrecision } from "@blueprintjs/datetime2";
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "chai";
import esLocale from "date-fns/locale/es";
import React from "react";
import * as sinon from "sinon";
import { describe, it } from "vitest";

import { getDateFnsFormatter } from "../common/dateRangeInputTestUtils";

type NullableRange<T> = [T | null, T | null];

const DATE_FORMAT = getDateFnsFormatter("M/d/yyyy");
const DATETIME_FORMAT = getDateFnsFormatter("M/d/yyyy HH:mm:ss");

const YEAR = 2022;
const START_DAY = 22;
const START_DATE = new Date(YEAR, Months.JANUARY, START_DAY);
const START_STR = DATE_FORMAT.formatDate(START_DATE);
const END_DAY = 24;
const END_DATE = new Date(YEAR, Months.JANUARY, END_DAY);
const END_STR = DATE_FORMAT.formatDate(END_DATE);
const DATE_RANGE = [START_DATE, END_DATE] as DateRange;

const START_DATE_2 = new Date(YEAR, Months.JANUARY, 1);
const START_STR_2 = DATE_FORMAT.formatDate(START_DATE_2);
const START_STR_2_ES_LOCALE = "1 de enero de 2022";
const END_DATE_2 = new Date(YEAR, Months.JANUARY, 31);
const END_STR_2 = DATE_FORMAT.formatDate(END_DATE_2);
const END_STR_2_ES_LOCALE = "31 de enero de 2022";
const DATE_RANGE_2 = [START_DATE_2, END_DATE_2] as DateRange;

const INVALID_STR = "<this is an invalid date string>";
const INVALID_MESSAGE = "Custom invalid-date message";

const OUT_OF_RANGE_TEST_MIN = new Date(2000, 1, 1);
const OUT_OF_RANGE_TEST_MAX = new Date(2030, 1, 1);
const OUT_OF_RANGE_START_DATE = new Date(1000, 1, 1);
const OUT_OF_RANGE_START_STR = DATE_FORMAT.formatDate(OUT_OF_RANGE_START_DATE);
const OUT_OF_RANGE_END_DATE = new Date(3000, 1, 1);
const OUT_OF_RANGE_END_STR = DATE_FORMAT.formatDate(OUT_OF_RANGE_END_DATE);
const OUT_OF_RANGE_MESSAGE = "Custom out-of-range message";

const OVERLAPPING_DATES_MESSAGE = "Custom overlapping-dates message";
const OVERLAPPING_START_DATE = END_DATE_2; // should be later then END_DATE
const OVERLAPPING_END_DATE = START_DATE_2; // should be earlier then START_DATE
const OVERLAPPING_START_STR = DATE_FORMAT.formatDate(OVERLAPPING_START_DATE);
const OVERLAPPING_END_STR = DATE_FORMAT.formatDate(OVERLAPPING_END_DATE);

const OVERLAPPING_START_DATETIME = new Date(2022, Months.JANUARY, 1, 9); // should be same date but later time
const OVERLAPPING_END_DATETIME = new Date(2022, Months.JANUARY, 1, 1); // should be same date but earlier time
const OVERLAPPING_START_DT_STR = DATETIME_FORMAT.formatDate(OVERLAPPING_START_DATETIME);
const OVERLAPPING_END_DT_STR = DATETIME_FORMAT.formatDate(OVERLAPPING_END_DATETIME);
const DATE_RANGE_3 = [OVERLAPPING_END_DATETIME, OVERLAPPING_START_DATETIME] as DateRange; // initial state should be correct

describe("<DateRangeInput3> (RTL)", () => {
    it("renders with two InputGroup children", () => {
        render(<DateRangeInput3 {...DATE_FORMAT} />);
        expect(screen.getAllByRole("textbox")).to.have.lengthOf(2);
    });

    it("passes custom classNames to popover wrapper", () => {
        const CLASS_1 = "foo";
        const CLASS_2 = "bar";

        const { container } = render(
            <DateRangeInput3
                {...DATE_FORMAT}
                className={CLASS_1}
                popoverProps={{ className: CLASS_2, usePortal: false }}
            />,
        );

        const popoverTarget = container.querySelector(`.${CoreClasses.POPOVER_TARGET}`);

        expect(popoverTarget?.classList.contains(CLASS_1)).to.be.true;
        expect(popoverTarget?.classList.contains(CLASS_2)).to.be.true;
    });

    it("shows empty fields when no date range is selected", async () => {
        render(<DateRangeInput3 {...DATE_FORMAT} />);

        expect(getStartInputElement().value).to.equal("");
        expect(getEndInputElement().value).to.equal("");
    });

    describe("timePrecision prop", () => {
        it("<TimePicker /> should not lose focus on increment/decrement with up/down arrows", async () => {
            const { container } = render(
                <DateRangeInput3
                    {...DATE_FORMAT}
                    timePrecision={TimePrecision.MINUTE}
                    popoverProps={{ usePortal: false }}
                />,
            );

            await userEvent.click(getStartInputElement());

            const hourInputs = screen.getAllByRole<HTMLInputElement>("spinbutton", {
                name: "hours (24hr clock)",
            });

            // DateRangeInput3 renders two TimePicker components, we only care about testing one of them
            const firstHourInput = hourInputs[0];

            await userEvent.type(firstHourInput, "{arrowup}");

            expect(document.activeElement).to.equal(firstHourInput);
            expect(firstHourInput.value).to.equal("1");

            // assert that popover still open
            expect(getPopover(container)).not.to.be.null;
        });

        it("when timePrecision != null && closeOnSelection=true && end <TimePicker /> values is changed directly (without setting the selectedEnd date) - popover should not close", async () => {
            const { container } = render(
                <DateRangeInput3
                    {...DATE_FORMAT}
                    timePrecision={TimePrecision.MINUTE}
                    popoverProps={{ usePortal: false }}
                />,
            );

            await userEvent.click(getStartInputElement());

            const hourInputs = screen.getAllByRole<HTMLInputElement>("spinbutton", {
                name: "hours (24hr clock)",
            });

            // DateRangeInput3 renders two TimePicker components, we only care about testing one of them
            const firstHourInput = hourInputs[0];

            await userEvent.type(firstHourInput, "{arrowup}");
            await userEvent.type(firstHourInput, "{arrowup}");

            expect(document.activeElement).to.equal(firstHourInput);

            // assert that popover still open
            expect(getPopover(container)).not.to.be.null;
        });
    });

    describe("startInputProps and endInputProps", () => {
        it("startInput is disabled when startInputProps={ disabled: true }", async () => {
            const { container } = render(
                <DateRangeInput3
                    {...DATE_FORMAT}
                    startInputProps={{ disabled: true }}
                    popoverProps={{ usePortal: false }}
                />,
            );
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);

            expect(getPopover(container)).to.be.null;
            expect(startInput.getAttribute("aria-disabled")).to.equal("true");
            expect(endInput.getAttribute("aria-disabled")).to.equal("false");
        });

        it("endInput is disabled when endInputProps={ disabled: true }", async () => {
            const { container } = render(
                <DateRangeInput3
                    {...DATE_FORMAT}
                    endInputProps={{ disabled: true }}
                    popoverProps={{ usePortal: false }}
                />,
            );
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(endInput);

            expect(getPopover(container)).to.be.null;
            expect(startInput.getAttribute("aria-disabled")).to.equal("false");
            expect(endInput.getAttribute("aria-disabled")).to.equal("true");
        });

        describe("startInputProps", () => {
            it("allows custom placeholder text", () => {
                const placeholder = "Hello";
                render(<DateRangeInput3 {...DATE_FORMAT} startInputProps={{ placeholder }} />);

                expect(screen.getByPlaceholderText(placeholder)).to.exist;
            });

            it("supports custom style", () => {
                const style = { background: "yellow" };
                render(<DateRangeInput3 {...DATE_FORMAT} startInputProps={{ style }} />);

                expect(getStartInputElement().style.background).to.equal("yellow");
            });

            it("calls onChange when the value is changed", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} startInputProps={{ onChange }} />);

                await userEvent.type(getStartInputElement(), "x");

                expect(onChange.called).to.be.true;
            });

            it("calls onFocus when the input is focused", async () => {
                const onFocus = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        startInputProps={{ onFocus }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.click(getStartInputElement());

                expect(onFocus.calledOnce).to.be.true;
            });

            it("calls onBlur when the input is blurred", async () => {
                const onBlur = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        startInputProps={{ onBlur }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.click(getStartInputElement());
                await userEvent.tab();

                expect(onBlur.calledOnce).to.be.true;
            });

            it("calls onKeyDown when a key is pressed", async () => {
                const onKeyDown = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        startInputProps={{ onKeyDown }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.type(getStartInputElement(), "{enter}");

                expect(onKeyDown.calledOnce).to.be.true;
            });

            it("calls onMouseDown when the input is clicked", async () => {
                const onMouseDown = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        startInputProps={{ onMouseDown }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.click(getStartInputElement());

                expect(onMouseDown.calledOnce).to.be.true;
            });
        });

        describe("endInputProps", () => {
            it("allows custom placeholder text", () => {
                const placeholder = "Goodbye";
                render(<DateRangeInput3 {...DATE_FORMAT} endInputProps={{ placeholder }} />);

                expect(screen.getByPlaceholderText(placeholder)).to.exist;
            });

            it("supports custom style", () => {
                const style = { background: "yellow" };
                render(<DateRangeInput3 {...DATE_FORMAT} endInputProps={{ style }} />);

                expect(getEndInputElement().style.background).to.equal("yellow");
            });

            it("calls onChange when the value is changed", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} popoverProps={{ usePortal: false }} />);

                await userEvent.type(getEndInputElement(), "1/1/2025");

                expect(onChange.calledOnce).to.be.true;
                expect(onChange.calledWith([null, new Date(2025, 0, 1)])).to.be.true;
            });

            it("calls onFocus when the input is focused", async () => {
                const onFocus = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        endInputProps={{ onFocus }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.click(getEndInputElement());

                expect(onFocus.calledOnce).to.be.true;
            });

            it("calls onBlur when the input is blurred", async () => {
                const onBlur = sinon.spy();
                render(
                    <DateRangeInput3 {...DATE_FORMAT} endInputProps={{ onBlur }} popoverProps={{ usePortal: false }} />,
                );

                await userEvent.click(getEndInputElement());
                await userEvent.tab();

                expect(onBlur.calledOnce).to.be.true;
            });

            it("calls onKeyDown when a key is pressed", async () => {
                const onKeyDown = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        endInputProps={{ onKeyDown }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.type(getEndInputElement(), "{enter}");

                expect(onKeyDown.calledOnce).to.be.true;
            });

            it("calls onMouseDown when the input is clicked", async () => {
                const onMouseDown = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        endInputProps={{ onMouseDown }}
                        popoverProps={{ usePortal: false }}
                    />,
                );

                await userEvent.click(getEndInputElement());

                expect(onMouseDown.calledOnce).to.be.true;
            });
        });
    });

    describe("placeholder text", () => {
        it("shows proper placeholder text when empty inputs are focused and unfocused", async () => {
            const MIN_DATE = new Date(2022, Months.JANUARY, 1);
            const MAX_DATE = new Date(2022, Months.JANUARY, 31);
            render(<DateRangeInput3 {...DATE_FORMAT} minDate={MIN_DATE} maxDate={MAX_DATE} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);

            expect(startInput.placeholder).to.equal(DATE_FORMAT.formatDate(MIN_DATE));

            await userEvent.tab();

            expect(endInput.placeholder).to.equal(DATE_FORMAT.formatDate(MAX_DATE));
        });

        it("updates placeholder text properly when format changes", async () => {
            const FORMAT = getDateFnsFormatter("MM/dd/yyyy");
            const MIN_DATE = new Date(2022, Months.JANUARY, 1);
            const MAX_DATE = new Date(2022, Months.JANUARY, 31);
            render(<DateRangeInput3 {...FORMAT} minDate={MIN_DATE} maxDate={MAX_DATE} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);

            expect(startInput.placeholder).to.equal(FORMAT.formatDate(MIN_DATE));

            await userEvent.tab();

            expect(endInput.placeholder).to.equal(FORMAT.formatDate(MAX_DATE));
        });
    });

    it("inputs disable and popover doesn't open if disabled=true", async () => {
        const { container } = render(
            <DateRangeInput3 {...DATE_FORMAT} disabled={true} popoverProps={{ usePortal: false }} />,
        );
        const startInput = getStartInputElement();
        const endInput = getEndInputElement();

        await userEvent.click(startInput);
        await userEvent.click(endInput);

        expect(getPopover(container)).to.be.null;
        expect(startInput.getAttribute("aria-disabled")).to.equal("true");
        expect(endInput.getAttribute("aria-disabled")).to.equal("true");
    });

    describe("closeOnSelection", () => {
        it("if closeOnSelection=false, popover stays open when full date range is selected", async () => {
            const { container } = render(
                <DateRangeInput3 {...DATE_FORMAT} closeOnSelection={false} popoverProps={{ usePortal: false }} />,
            );

            await userEvent.click(getStartInputElement());
            await userEvent.click(getPastWeekMenuItem());

            expect(getPopover(container)).not.to.be.null;
        });

        it("if closeOnSelection=true, popover closes when full date range is selected", async () => {
            const { container } = render(
                <DateRangeInput3 {...DATE_FORMAT} closeOnSelection={true} popoverProps={{ usePortal: false }} />,
            );

            await userEvent.click(getStartInputElement());
            await userEvent.click(getPastWeekMenuItem());

            await waitForElementToBeRemoved(() => getPopover(container));
        });

        it("if closeOnSelection=true && timePrecision != null, popover closes when full date range is selected", async () => {
            const { container } = render(
                <DateRangeInput3
                    {...DATE_FORMAT}
                    timePrecision={TimePrecision.MINUTE}
                    popoverProps={{ usePortal: false }}
                    singleMonthOnly={true}
                />,
            );

            await userEvent.click(getStartInputElement());
            await userEvent.click(getPastWeekMenuItem());

            await waitForElementToBeRemoved(() => getPopover(container));
        });
    });

    it("accepts contiguousCalendarMonths prop and passes it to the date range picker", async () => {
        render(<DateRangeInput3 contiguousCalendarMonths={false} />);

        await userEvent.click(getStartInputElement());

        // with contiguousCalendarMonths={false}, we should see two buttons for going forward/backward a month
        expect(await screen.findAllByRole("button", { name: /go to next month/i })).to.have.lengthOf(2);
        expect(await screen.findAllByRole("button", { name: /go to previous month/i })).to.have.lengthOf(2);
    });

    it("accepts singleMonthOnly prop and passes it to the date range picker", async () => {
        render(<DateRangeInput3 singleMonthOnly={true} />);

        await userEvent.click(getStartInputElement());

        // with singleMonthOnly={true}, we should only see one month grid
        expect(screen.getAllByRole("grid")).to.have.lengthOf(1);
    });

    it("accepts shortcuts prop and passes it to the date range picker", async () => {
        render(<DateRangeInput3 shortcuts={false} />);

        await userEvent.click(getStartInputElement());

        // with shortcuts={false}, we should not see any shortcut buttons
        expect(screen.queryByRole("menu", { name: /date picker shortcuts/i })).to.be.null;
    });

    it("should update the selectedShortcutIndex state when clicking on a shortcut", async () => {
        render(<DateRangeInput3 closeOnSelection={false} />);

        await userEvent.click(getStartInputElement());

        const pastWeek = getPastWeekMenuItem();
        await userEvent.click(pastWeek);

        // This is a bit of a hack, the shortcuts menu doesn't currently expose a selected role on menu items
        expect(pastWeek.classList.contains(CoreClasses.ACTIVE)).to.be.true;
    });

    it("pressing Shift+Tab in the start field blurs the start field and closes the popover", async () => {
        const { container } = render(<DateRangeInput3 {...DATE_FORMAT} />);
        const startInput = getStartInputElement();

        await userEvent.click(startInput);
        await userEvent.tab({ shift: true });

        expect(document.activeElement).not.to.equal(startInput);
        expect(container.querySelector(`.${CoreClasses.POPOVER}`)).to.be.null;
    });

    it("pressing Tab in the end field blurs the end field and closes the popover", async () => {
        const { container } = render(<DateRangeInput3 {...DATE_FORMAT} />);
        const endInput = getEndInputElement();

        await userEvent.click(endInput);
        await userEvent.tab();

        expect(document.activeElement).not.to.equal(endInput);
        expect(container.querySelector(`.${CoreClasses.POPOVER}`)).to.be.null;
    });

    describe("selectAllOnFocus", () => {
        it("if false (the default), does not select any text on focus", async () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={[START_DATE, null]} />);
            const startInput = getStartInputElement();

            await userEvent.click(startInput);

            expect(startInput.selectionStart).to.equal(startInput.selectionEnd);
        });

        it("if true, selects all text on focus", async () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={[START_DATE, null]} selectAllOnFocus={true} />);
            const startInput = getStartInputElement();

            await userEvent.click(startInput);

            expect(startInput.selectionStart).to.equal(0);
            expect(startInput.selectionEnd).to.equal(START_STR.length);
        });

        it("if true, selects all text on day hover in calendar", async () => {
            render(<DateRangeInput3 {...DATE_FORMAT} selectAllOnFocus={true} />);
            const startInput = getStartInputElement();

            await userEvent.click(startInput);

            const day = screen.getAllByRole("gridcell", { name: "1" });
            const firstDay = day[0];

            await userEvent.hover(firstDay);

            expect(startInput.selectionStart).to.equal(0);
            expect(startInput.selectionEnd).to.be.greaterThan(0);
        });
    });

    describe("allowSingleDayRange", () => {
        it("allows start and end to be the same day when clicking", async () => {
            render(
                <DateRangeInput3 {...DATE_FORMAT} allowSingleDayRange={true} defaultValue={[START_DATE, END_DATE]} />,
            );
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(endInput);

            // range of selected days
            const selected = screen.getAllByRole("gridcell", { selected: true });

            expect(selected).to.have.lengthOf(3);

            // click on the last day of the range
            await userEvent.click(selected[selected.length - 1]);

            // click on the first day of the range
            await userEvent.click(selected[0]);

            expect(startInput.value).to.equal(START_STR);
            expect(endInput.value).to.equal(START_STR);
        });
    });

    describe("popoverProps", () => {
        it("ignores autoFocus, enforceFocus, and content in custom popoverProps", async () => {
            const CUSTOM_CONTENT = "Here is some custom content";
            const popoverProps = {
                autoFocus: true,
                content: CUSTOM_CONTENT,
                enforceFocus: true,
                usePortal: false,
            };
            render(<DateRangeInput3 {...DATE_FORMAT} popoverProps={popoverProps} />);
            const startInput = getStartInputElement();

            await userEvent.click(startInput);

            expect(document.activeElement).to.equal(startInput);
            expect(screen.queryByText(CUSTOM_CONTENT)).to.be.null;
        });
    });

    describe("when uncontrolled", () => {
        it("Shows empty fields when defaultValue is [null, null]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={[null, null]} />);

            expect(getStartInputElement().value).to.equal("");
            expect(getEndInputElement().value).to.equal("");
        });

        it("Shows empty start field and formatted date in end field when defaultValue is [null, <date>]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={[null, END_DATE]} />);

            expect(getStartInputElement().value).to.equal("");
            expect(getEndInputElement().value).to.equal(END_STR);
        });

        it("Shows empty end field and formatted date in start field when defaultValue is [<date>, null]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={[START_DATE, null]} />);

            expect(getStartInputElement().value).to.equal(START_STR);
            expect(getEndInputElement().value).to.equal("");
        });

        it("Shows formatted dates in both fields when defaultValue is [<date1>, <date2>]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={[START_DATE, END_DATE]} />);

            expect(getStartInputElement().value).to.equal(START_STR);
            expect(getEndInputElement().value).to.equal(END_STR);
        });

        it("Pressing Enter saves the inputted date and closes the popover", async () => {
            const { container } = render(<DateRangeInput3 {...DATE_FORMAT} popoverProps={{ usePortal: false }} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.type(startInput, START_STR);
            await userEvent.type(startInput, "{enter}");

            expect(document.activeElement).not.to.equal(startInput);
            expect(document.activeElement).to.equal(endInput);

            await userEvent.type(endInput, END_STR);
            await userEvent.type(endInput, "{enter}");

            await waitForElementToBeRemoved(() => getPopover(container));

            expect(startInput.value).to.equal(START_STR);
            expect(endInput.value).to.equal(END_STR);
        });

        it("Clicking a date invokes onChange with the new date range and updates the input fields", async () => {
            const defaultValue = [START_DATE, null] as DateRange;
            const onChange = sinon.spy();
            render(
                <DateRangeInput3
                    {...DATE_FORMAT}
                    closeOnSelection={false}
                    defaultValue={defaultValue}
                    onChange={onChange}
                    singleMonthOnly={true}
                />,
            );
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(endInput);

            const startDay = screen.getByRole("gridcell", { name: `${START_DAY}` });
            const endDay = screen.getByRole("gridcell", { name: `${END_DAY}` });

            await userEvent.click(endDay);

            expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(START_STR), new Date(END_STR)]);
            expect(startInput.value).to.equal(START_STR);
            expect(endInput.value).to.equal(END_STR);

            await userEvent.click(startDay);

            expect(onChange.getCall(1).args[0]).to.deep.equal([null, new Date(END_STR)]);
            expect(startInput.value).to.equal("");
            expect(endInput.value).to.equal(END_STR);

            await userEvent.click(endDay);

            expect(onChange.getCall(2).args[0]).to.deep.equal([null, null]);
            expect(startInput.value).to.equal("");
            expect(endInput.value).to.equal("");

            await userEvent.click(startDay);

            expect(onChange.getCall(3).args[0]).to.deep.equal([new Date(START_STR), null]);
            expect(startInput.value).to.equal(START_STR);
            expect(endInput.value).to.equal("");

            expect(onChange.callCount).to.equal(4);
        });

        it("Typing a valid start or end date invokes onChange with the new date range and updates the input fields", async () => {
            const onChange = sinon.spy();
            render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.type(startInput, START_STR_2);

            expect(onChange.callCount).to.equal(1);
            expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(START_STR_2), null]);
            expect(startInput.value).to.equal(START_STR_2);

            await userEvent.type(endInput, END_STR_2);

            expect(onChange.callCount).to.equal(2);
            expect(onChange.getCall(1).args[0]).to.deep.equal([new Date(START_STR_2), new Date(END_STR_2)]);
            expect(startInput.value).to.equal(START_STR_2);
        });

        describe("Typing an out-of-range date", () => {
            it("shows the error message on blur", async () => {
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        minDate={OUT_OF_RANGE_TEST_MIN}
                        maxDate={OUT_OF_RANGE_TEST_MAX}
                        outOfRangeMessage={OUT_OF_RANGE_MESSAGE}
                    />,
                );
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, OUT_OF_RANGE_START_STR);
                await userEvent.tab();

                expect(startInput.value).to.equal(OUT_OF_RANGE_MESSAGE);

                await userEvent.type(endInput, OUT_OF_RANGE_END_STR);
                await userEvent.tab();

                expect(endInput.value).to.equal(OUT_OF_RANGE_MESSAGE);
            });

            it("shows the offending date in the field on focus", async () => {
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        minDate={OUT_OF_RANGE_TEST_MIN}
                        maxDate={OUT_OF_RANGE_TEST_MAX}
                        outOfRangeMessage={OUT_OF_RANGE_MESSAGE}
                    />,
                );
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, OUT_OF_RANGE_START_STR);
                await userEvent.tab();
                await userEvent.click(startInput);

                expect(startInput.value).to.equal(OUT_OF_RANGE_START_STR);

                await userEvent.type(endInput, OUT_OF_RANGE_END_STR);
                await userEvent.tab();
                await userEvent.click(endInput);

                expect(endInput.value).to.equal(OUT_OF_RANGE_END_STR);
            });

            it("calls onError with invalid date on startInput blur", async () => {
                const onError = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        minDate={OUT_OF_RANGE_TEST_MIN}
                        maxDate={OUT_OF_RANGE_TEST_MAX}
                        onError={onError}
                    />,
                );

                await userEvent.type(getStartInputElement(), OUT_OF_RANGE_START_STR);

                expect(onError.called).to.be.false;

                await userEvent.tab();

                expect(onError.calledOnce).to.be.true;

                expect(onError.getCall(0).args[0]).to.deep.equal([new Date(OUT_OF_RANGE_START_STR), null]);
            });

            it("calls onError with invalid date on endInput blur", async () => {
                const onError = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        minDate={OUT_OF_RANGE_TEST_MIN}
                        maxDate={OUT_OF_RANGE_TEST_MAX}
                        onError={onError}
                    />,
                );

                await userEvent.type(getEndInputElement(), OUT_OF_RANGE_END_STR);

                expect(onError.called).to.be.false;

                await userEvent.tab();

                expect(onError.calledOnce).to.be.true;

                expect(onError.getCall(0).args[0]).to.deep.equal([null, new Date(OUT_OF_RANGE_END_STR)]);
            });

            it("does NOT call onChange before OR after blur", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        minDate={OUT_OF_RANGE_TEST_MIN}
                        maxDate={OUT_OF_RANGE_TEST_MAX}
                        onChange={onChange}
                    />,
                );
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, OUT_OF_RANGE_START_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.false;

                await userEvent.type(endInput, OUT_OF_RANGE_END_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.false;
            });

            it("removes error message if input is changed to an in-range date again", async () => {
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        minDate={OUT_OF_RANGE_TEST_MIN}
                        maxDate={OUT_OF_RANGE_TEST_MAX}
                        outOfRangeMessage={OUT_OF_RANGE_MESSAGE}
                    />,
                );
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, OUT_OF_RANGE_START_STR);
                await userEvent.tab();

                expect(startInput.value).to.equal(OUT_OF_RANGE_MESSAGE);

                await userEvent.clear(startInput);
                await userEvent.type(startInput, START_STR);
                await userEvent.tab();

                expect(startInput.value).to.equal(START_STR);

                await userEvent.type(endInput, OUT_OF_RANGE_END_STR);
                await userEvent.tab();

                expect(endInput.value).to.equal(OUT_OF_RANGE_MESSAGE);

                await userEvent.clear(endInput);
                await userEvent.type(endInput, END_STR);
                await userEvent.tab();

                expect(endInput.value).to.equal(END_STR);
            });
        });

        describe("Typing an invalid date", () => {
            it("shows the error message on blur", async () => {
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, INVALID_STR);
                await userEvent.tab();

                expect(startInput.value).to.equal(INVALID_MESSAGE);

                await userEvent.type(endInput, INVALID_STR);
                await userEvent.tab();

                expect(endInput.value).to.equal(INVALID_MESSAGE);
            });

            it("keeps showing the error message on next focus", async () => {
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, INVALID_STR);
                await userEvent.tab();
                await userEvent.click(startInput);

                expect(startInput.value).to.equal(INVALID_MESSAGE);

                await userEvent.type(endInput, INVALID_STR);
                await userEvent.tab();
                await userEvent.click(endInput);

                expect(endInput.value).to.equal(INVALID_MESSAGE);
            });

            it("calls onError on blur with Date(undefined) in place of the invalid date", async () => {
                const onError = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} onError={onError} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, INVALID_STR);
                await userEvent.tab();

                expect(onError.calledOnce).to.be.true;

                expect((onError.getCall(0).args[0][0] as Date).valueOf()).to.be.NaN;

                await userEvent.type(endInput, INVALID_STR);
                await userEvent.tab();

                expect(onError.calledTwice).to.be.true;

                expect((onError.getCall(1).args[0][1] as Date).valueOf()).to.be.NaN;
            });

            it("does NOT call onChange before OR after blur", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} onChange={onChange} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, INVALID_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.false;

                await userEvent.type(endInput, INVALID_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.false;
            });

            it("removes error message if input is changed to an in-range date again", async () => {
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, INVALID_STR);
                await userEvent.tab();

                expect(startInput.value).to.equal(INVALID_MESSAGE);

                await userEvent.clear(startInput);
                await userEvent.type(startInput, START_STR);
                await userEvent.tab();

                expect(startInput.value).to.equal(START_STR);

                await userEvent.type(endInput, INVALID_STR);
                await userEvent.tab();

                expect(endInput.value).to.equal(INVALID_MESSAGE);

                await userEvent.clear(endInput);
                await userEvent.type(endInput, END_STR);
                await userEvent.tab();

                expect(endInput.value).to.equal(END_STR);
            });

            it("calls onChange if startInput is in range and endInput is out of range", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} onChange={onChange} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(startInput, OUT_OF_RANGE_START_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.false;

                await userEvent.type(endInput, END_STR);
                await userEvent.tab();

                expect(onChange.calledOnce).to.be.true;

                expect(onChange.getCall(0).args[0]).to.deep.equal([
                    new Date(OUT_OF_RANGE_START_STR),
                    new Date(END_STR),
                ]);
            });

            it("calls onChange if startInput is out of range and endInput is in range", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} invalidDateMessage={INVALID_MESSAGE} onChange={onChange} />);
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                await userEvent.type(endInput, OUT_OF_RANGE_END_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.false;

                await userEvent.type(startInput, START_STR);
                await userEvent.tab();

                expect(onChange.called).to.be.true;
            });
        });

        describe("Typing an overlapping date time", () => {
            describe("in the end field", () => {
                it("shows an error message when the start time is later than the end time", async () => {
                    const onChange = sinon.spy();
                    render(
                        <DateRangeInput3
                            {...DATETIME_FORMAT}
                            allowSingleDayRange={true}
                            defaultValue={DATE_RANGE_3}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                            onChange={onChange}
                            timePrecision={TimePrecision.MINUTE}
                        />,
                    );
                    const startInput = getStartInputElement();
                    const endInput = getEndInputElement();

                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, OVERLAPPING_START_DT_STR);
                    await userEvent.tab();

                    expect(startInput.value).to.equal(OVERLAPPING_START_DT_STR);

                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, OVERLAPPING_END_DT_STR);
                    await userEvent.tab();

                    expect(endInput.value).to.equal(OVERLAPPING_DATES_MESSAGE);
                });
            });
        });

        // this test sub-suite is structured a little differently because of the
        // different semantics of this error case in each field
        describe("Typing an overlapping date", () => {
            describe("in the start field", () => {
                it("shows an error message in the end field right away", async () => {
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                        />,
                    );
                    const startInput = getStartInputElement();
                    const endInput = getEndInputElement();

                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, OVERLAPPING_START_STR);

                    expect(endInput.value).to.equal(OVERLAPPING_DATES_MESSAGE);
                });

                it("shows the offending date in the end field on focus in the end field", async () => {
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                        />,
                    );
                    const startInput = getStartInputElement();
                    const endInput = getEndInputElement();

                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, OVERLAPPING_START_STR);

                    expect(endInput.value).to.equal(OVERLAPPING_DATES_MESSAGE);

                    await userEvent.tab();

                    expect(endInput.value).to.equal(END_STR);
                });

                it("calls onError with [<overlappingDate>, <endDate>] on blur", async () => {
                    const onError = sinon.spy();
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                            onError={onError}
                        />,
                    );
                    const startInput = getStartInputElement();

                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, OVERLAPPING_START_STR);
                    await userEvent.tab();

                    expect(onError.calledOnce).to.be.true;

                    expect(onError.getCall(0).args[0]).to.deep.equal([
                        new Date(OVERLAPPING_START_STR),
                        new Date(END_STR),
                    ]);
                });

                it("does NOT call onChange before OR after blur", async () => {
                    const onChange = sinon.spy();
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                            onChange={onChange}
                        />,
                    );
                    const startInput = getStartInputElement();

                    // avoid calling userEvent.clear() because it triggers onChange
                    // double click to select all text and then type to replace it
                    await userEvent.dblClick(startInput);
                    await userEvent.keyboard(OVERLAPPING_START_STR);

                    await userEvent.tab();

                    expect(onChange.called).to.be.false;
                });

                it("removes error message if input is changed to an in-range date again", async () => {
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                        />,
                    );
                    const startInput = getStartInputElement();
                    const endInput = getEndInputElement();

                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, OVERLAPPING_START_STR);
                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, START_STR);

                    expect(endInput.value).to.equal(END_STR);
                });
            });

            describe("in the end field", () => {
                it("shows an error message in the end field on blur", async () => {
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                        />,
                    );
                    const endInput = getEndInputElement();

                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, OVERLAPPING_END_STR);

                    expect(endInput.value).to.equal(OVERLAPPING_END_STR);

                    await userEvent.tab();

                    expect(endInput.value).to.equal(OVERLAPPING_DATES_MESSAGE);
                });

                it("shows the offending date in the end field on re-focus", async () => {
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                        />,
                    );
                    const endInput = getEndInputElement();

                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, OVERLAPPING_END_STR);
                    await userEvent.tab();
                    await userEvent.click(endInput);

                    expect(endInput.value).to.equal(OVERLAPPING_END_STR);
                });

                it("calls onError with [<startDate>, <overlappingDate>] on blur", async () => {
                    const onError = sinon.spy();
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                            onError={onError}
                        />,
                    );
                    const endInput = getEndInputElement();

                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, OVERLAPPING_END_STR);

                    expect(onError.called).to.be.false;

                    await userEvent.tab();

                    expect(onError.calledOnce).to.be.true;
                    expect(onError.getCall(0).args[0]).to.deep.equal([
                        new Date(START_STR),
                        new Date(OVERLAPPING_END_STR),
                    ]);
                });

                it("does NOT call onChange before OR after blur", async () => {
                    const onChange = sinon.spy();
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                            onChange={onChange}
                        />,
                    );
                    const endInput = getEndInputElement();

                    // avoid calling userEvent.clear() because it triggers onChange
                    // triple click to select all text and then type to replace it
                    await userEvent.dblClick(endInput);
                    await userEvent.keyboard(OVERLAPPING_START_STR);
                    await userEvent.tab();

                    expect(onChange.called).to.be.false;
                });

                it("removes error message if input is changed to an in-range date again", async () => {
                    render(
                        <DateRangeInput3
                            {...DATE_FORMAT}
                            defaultValue={DATE_RANGE}
                            overlappingDatesMessage={OVERLAPPING_DATES_MESSAGE}
                        />,
                    );
                    const endInput = getEndInputElement();

                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, OVERLAPPING_END_STR);
                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, END_STR);

                    expect(endInput.value).to.equal(END_STR);
                });
            });
        });

        describe("Arrow key navigation", () => {
            it("Pressing an arrow key has no effect when the input is not fully selected", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={DATE_RANGE} />);

                await userEvent.click(getStartInputElement());
                await userEvent.keyboard("{arrowdown}");

                expect(onChange.called).to.be.false;

                await userEvent.click(getEndInputElement());
                await userEvent.keyboard("{arrowdown}");

                expect(onChange.called).to.be.false;
            });

            it("Pressing the left arrow key moves the date back by a day", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const startInput = getStartInputElement();

                const expectedStartDate1 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, START_DAY - 1));
                const expectedStartDate2 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, START_DAY - 2));

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowleft}");

                expect(startInput.value).to.equal(expectedStartDate1);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(expectedStartDate1), new Date(END_STR)]);

                await userEvent.keyboard("{arrowleft}");

                expect(startInput.value).to.equal(expectedStartDate2);
                expect(onChange.getCall(1).args[0]).to.deep.equal([new Date(expectedStartDate2), new Date(END_STR)]);
            });

            it("Pressing the right arrow key moves the date forward by a day", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const endInput = getEndInputElement();

                const expectedEndDate1 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, END_DAY + 1));
                const expectedEndDate2 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, END_DAY + 2));

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowright}");

                expect(endInput.value).to.equal(expectedEndDate1);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(START_STR), new Date(expectedEndDate1)]);

                await userEvent.keyboard("{arrowright}");

                expect(endInput.value).to.equal(expectedEndDate2);
                expect(onChange.getCall(1).args[0]).to.deep.equal([new Date(START_STR), new Date(expectedEndDate2)]);
            });

            it("Pressing the up arrow key moves the date back by a week", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const startInput = getStartInputElement();

                const expectedStartDate1 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, START_DAY - 7));
                const expectedStartDate2 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, START_DAY - 14));

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowup}");

                expect(startInput.value).to.equal(expectedStartDate1);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(expectedStartDate1), new Date(END_STR)]);

                await userEvent.keyboard("{arrowup}");

                expect(startInput.value).to.equal(expectedStartDate2);
                expect(onChange.getCall(1).args[0]).to.deep.equal([new Date(expectedStartDate2), new Date(END_STR)]);
            });

            it("Pressing the down arrow key moves the date forward by a week", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const endInput = getEndInputElement();

                const expectedEndDate1 = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, END_DAY + 7));
                const expectedEndDate2 = DATE_FORMAT.formatDate(new Date(YEAR, Months.FEBRUARY, 7));

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowdown}");

                expect(endInput.value).to.equal(expectedEndDate1);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(START_STR), new Date(expectedEndDate1)]);

                await userEvent.keyboard("{arrowdown}");

                expect(endInput.value).to.equal(expectedEndDate2);
                expect(onChange.getCall(1).args[0]).to.deep.equal([new Date(START_STR), new Date(expectedEndDate2)]);
            });

            it("Will not move past the end boundary", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const startInput = getStartInputElement();

                const expectedStartDate = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, END_DAY - 1));

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowdown}");

                expect(startInput.value).to.equal(expectedStartDate);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(expectedStartDate), new Date(END_STR)]);
            });

            it("Will not move past the end boundary when allowSingleDayRange={true}", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        allowSingleDayRange={true}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const startInput = getStartInputElement();

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowdown}");

                expect(startInput.value).to.equal(END_STR);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(END_STR), new Date(END_STR)]);
            });

            it("Will not move past the start boundary", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const endInput = getEndInputElement();

                const expectedEndDate = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, START_DAY + 1));

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowup}");

                expect(endInput.value).to.equal(expectedEndDate);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(START_STR), new Date(expectedEndDate)]);
            });

            it("Will not move past the start boundary when allowSingleDayRange={true}", async () => {
                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        allowSingleDayRange={true}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        selectAllOnFocus={true}
                    />,
                );
                const endInput = getEndInputElement();

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowup}");

                expect(endInput.value).to.equal(START_STR);
                expect(onChange.getCall(0).args[0]).to.deep.equal([new Date(START_STR), new Date(START_STR)]);
            });

            it("Will not move past the min date", async () => {
                const minDate = new Date(YEAR, Months.JANUARY, START_DAY - 3);
                const minDateStr = DATE_FORMAT.formatDate(minDate);

                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        minDate={minDate}
                        selectAllOnFocus={true}
                    />,
                );
                const startInput = getStartInputElement();

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowup}");

                expect(startInput.value).to.equal(minDateStr);
                expect(onChange.getCall(0).args[0]).to.deep.equal([minDate, new Date(END_STR)]);
            });

            it("Will not move past the max date", async () => {
                const maxDate = new Date(YEAR, Months.JANUARY, END_DAY + 3);
                const maxDateStr = DATE_FORMAT.formatDate(maxDate);

                const onChange = sinon.spy();
                render(
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        onChange={onChange}
                        defaultValue={DATE_RANGE}
                        maxDate={maxDate}
                        selectAllOnFocus={true}
                    />,
                );
                const endInput = getEndInputElement();

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowdown}");

                expect(endInput.value).to.equal(maxDateStr);
                expect(onChange.getCall(0).args[0]).to.deep.equal([START_DATE, maxDate]);
            });

            it("Will select today's date by default", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} />);
                const startInput = getStartInputElement();

                const today = DATE_FORMAT.formatDate(new Date());

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowdown}");

                expect(startInput.value).to.equal(today);
            });

            it("Will choose a reasonable end date when only the start is selected", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={[START_DATE, null]} />);
                const endInput = getEndInputElement();

                const expectedEndDate = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, START_DAY + 1));

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowright}");

                expect(endInput.value).to.equal(expectedEndDate);
            });

            it("Will choose a reasonable start date when only the end is selected", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={[null, END_DATE]} />);
                const startInput = getStartInputElement();

                const expectedEndDate = DATE_FORMAT.formatDate(new Date(YEAR, Months.JANUARY, END_DAY - 7));

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowup}");

                expect(startInput.value).to.equal(expectedEndDate);
            });

            it("Will not make a selection when trying to move backward and only the start is selected", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={[START_DATE, null]} />);
                const endInput = getEndInputElement();

                await userEvent.click(endInput);
                await userEvent.keyboard("{arrowleft}");
                await userEvent.keyboard("{arrowup}");

                expect(endInput.value).to.equal("");
                expect(onChange.called).to.be.false;
            });

            it("Will not make a selection when trying to move forward and only the end is selected", async () => {
                const onChange = sinon.spy();
                render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={[null, END_DATE]} />);
                const startInput = getStartInputElement();

                await userEvent.click(startInput);
                await userEvent.keyboard("{arrowright}");
                await userEvent.keyboard("{arrowdown}");

                expect(startInput.value).to.equal("");
                expect(onChange.called).to.be.false;
            });
        });

        describe("Hovering over dates", () => {
            // define new constants to clarify chronological ordering of dates
            // TODO: rename all date constants in this file to use a similar
            // scheme, then get rid of these extra constants

            const HOVER_TEST_DAY_1 = 5;
            const HOVER_TEST_DAY_2 = 10;
            const HOVER_TEST_DAY_3 = 15;
            const HOVER_TEST_DAY_4 = 20;
            const HOVER_TEST_DAY_5 = 25;

            const HOVER_TEST_DATE_1 = new Date(2022, Months.JANUARY, HOVER_TEST_DAY_1);
            const HOVER_TEST_DATE_2 = new Date(2022, Months.JANUARY, HOVER_TEST_DAY_2);
            const HOVER_TEST_DATE_3 = new Date(2022, Months.JANUARY, HOVER_TEST_DAY_3);
            const HOVER_TEST_DATE_4 = new Date(2022, Months.JANUARY, HOVER_TEST_DAY_4);
            const HOVER_TEST_DATE_5 = new Date(2022, Months.JANUARY, HOVER_TEST_DAY_5);

            const HOVER_TEST_STR_1 = DATE_FORMAT.formatDate(HOVER_TEST_DATE_1);
            const HOVER_TEST_STR_2 = DATE_FORMAT.formatDate(HOVER_TEST_DATE_2);
            const HOVER_TEST_STR_3 = DATE_FORMAT.formatDate(HOVER_TEST_DATE_3);
            const HOVER_TEST_STR_4 = DATE_FORMAT.formatDate(HOVER_TEST_DATE_4);
            const HOVER_TEST_STR_5 = DATE_FORMAT.formatDate(HOVER_TEST_DATE_5);

            const HOVER_TEST_DATE_CONFIG_1 = {
                date: HOVER_TEST_DATE_1,
                day: HOVER_TEST_DAY_1,
                str: HOVER_TEST_STR_1,
            };
            const HOVER_TEST_DATE_CONFIG_2 = {
                date: HOVER_TEST_DATE_2,
                day: HOVER_TEST_DAY_2,
                str: HOVER_TEST_STR_2,
            };
            const HOVER_TEST_DATE_CONFIG_3 = {
                date: HOVER_TEST_DATE_3,
                day: HOVER_TEST_DAY_3,
                str: HOVER_TEST_STR_3,
            };
            const HOVER_TEST_DATE_CONFIG_4 = {
                date: HOVER_TEST_DATE_4,
                day: HOVER_TEST_DAY_4,
                str: HOVER_TEST_STR_4,
            };
            const HOVER_TEST_DATE_CONFIG_5 = {
                date: HOVER_TEST_DATE_5,
                day: HOVER_TEST_DAY_5,
                str: HOVER_TEST_STR_5,
            };

            interface HoverTextDateConfig {
                day: number;
                date: Date;
                str: string;
            }

            async function setSelectedRangeForHoverTest(selectedDateConfigs: NullableRange<HoverTextDateConfig>) {
                const [startConfig, endConfig] = selectedDateConfigs;
                const startInput = getStartInputElement();
                const endInput = getEndInputElement();

                if (startConfig != null) {
                    await userEvent.clear(startInput);
                    await userEvent.type(startInput, startConfig.str);
                } else {
                    await userEvent.clear(startInput);
                }

                if (endConfig != null) {
                    await userEvent.clear(endInput);
                    await userEvent.type(endInput, endConfig.str);
                } else {
                    await userEvent.clear(endInput);
                }
            }

            describe("when selected date range is [null, null]", () => {
                const SELECTED_RANGE: NullableRange<HoverTextDateConfig> = [null, null];
                const HOVER_TEST_DATE_CONFIG = HOVER_TEST_DATE_CONFIG_1;

                describe("if start field is focused", () => {
                    it("shows [<hoveredDate>, null] in input fields", async () => {
                        render(
                            <DateRangeInput3
                                {...DATE_FORMAT}
                                closeOnSelection={false}
                                defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                            />,
                        );

                        await setSelectedRangeForHoverTest(SELECTED_RANGE);
                        await userEvent.click(getStartInputElement());
                        await userEvent.hover(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                        expect(screen.getByDisplayValue(HOVER_TEST_DATE_CONFIG.str)).to.exist;
                        expect(getEndInputElement()).to.exist;
                    });

                    it("keeps focus on start field", async () => {
                        render(
                            <DateRangeInput3
                                {...DATE_FORMAT}
                                closeOnSelection={false}
                                defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                            />,
                        );

                        await setSelectedRangeForHoverTest(SELECTED_RANGE);
                        await userEvent.click(getStartInputElement());
                        await userEvent.hover(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                        expect(screen.getByDisplayValue(HOVER_TEST_DATE_CONFIG.str)).to.equal(document.activeElement);
                    });

                    describe("on click", () => {
                        it("sets selection to [<hoveredDate>, null]", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(getStartInputElement());
                            await userEvent.click(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                            expect(screen.getByDisplayValue(HOVER_TEST_DATE_CONFIG.str)).to.exist;
                            expect(getEndInputElement()).to.exist;
                        });

                        it("moves focus to clicked day button", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(getStartInputElement());
                            await userEvent.click(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                            expect(getDayElement(HOVER_TEST_DATE_CONFIG.day)).to.equal(document.activeElement);
                        });
                    });

                    describe("if mouse moves to no longer be over a calendar day", () => {
                        it("shows [null, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);

                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(HOVER_TEST_DATE_CONFIG.day));
                            await userEvent.unhover(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal("");

                            // focus should remain on start input
                            expect(startInput).to.equal(document.activeElement);
                        });
                    });
                });

                describe("if end field is focused", () => {
                    it("shows [null, <hoveredDate>] in input fields", async () => {
                        render(
                            <DateRangeInput3
                                {...DATE_FORMAT}
                                closeOnSelection={false}
                                defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                            />,
                        );
                        const startInput = getStartInputElement();
                        const endInput = getEndInputElement();

                        await setSelectedRangeForHoverTest(SELECTED_RANGE);

                        await userEvent.click(endInput);
                        await userEvent.hover(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                        expect(startInput.value).to.equal("");
                        expect(endInput.value).to.equal(HOVER_TEST_DATE_CONFIG.str);
                    });

                    it("keeps focus on end field", async () => {
                        render(
                            <DateRangeInput3
                                {...DATE_FORMAT}
                                closeOnSelection={false}
                                defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                            />,
                        );
                        const endInput = getEndInputElement();

                        await setSelectedRangeForHoverTest(SELECTED_RANGE);

                        await userEvent.click(endInput);
                        await userEvent.hover(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                        expect(endInput).to.equal(document.activeElement);
                    });

                    describe("on click", () => {
                        it("sets selection to [null, <hoveredDate>]", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    // need to cast since InputGroupProps does not recognize data-* attributes as valid props
                                    startInputProps={{ "data-testid": "start-input" } as InputGroupProps}
                                    endInputProps={{ "data-testid": "end-input" } as InputGroupProps}
                                />,
                            );
                            // use test ids to get at elements since placeholder value changes based upon current date
                            const startInput = screen.getByTestId<HTMLInputElement>("start-input");
                            const endInput = screen.getByTestId<HTMLInputElement>("end-input");

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.click(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal(HOVER_TEST_DATE_CONFIG.str);
                        });

                        it("moves focus to clicked day button", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    endInputProps={{ "data-testid": "end-input" } as InputGroupProps}
                                />,
                            );
                            const endInput = screen.getByTestId<HTMLInputElement>("end-input");

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.click(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                            expect(getDayElement(HOVER_TEST_DATE_CONFIG.day)).to.equal(document.activeElement);
                        });
                    });

                    describe("if mouse moves to no longer be over a calendar day", () => {
                        it("shows [null, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);

                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(HOVER_TEST_DATE_CONFIG.day));
                            await userEvent.unhover(getDayElement(HOVER_TEST_DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal("");

                            // focus should remain on end input
                            expect(endInput).to.equal(document.activeElement);
                        });
                    });
                });
            });

            describe("when selected date range is [<startDate>, null]", () => {
                const SELECTED_RANGE: NullableRange<HoverTextDateConfig> = [HOVER_TEST_DATE_CONFIG_2, null];

                describe("if start field is focused", () => {
                    describe("if <startDate> < <hoveredDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_3;

                        it("shows [<hoveredDate>, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal("");
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, null]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal("");
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, null] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> < <startDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_1;

                        it("shows [<hoveredDate>, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal("");
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, null]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal("");
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, null] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <startDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_2;

                        it("shows [null, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal("");
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, null] on click", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal("");
                            });

                            it("keeps focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, null] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });
                });

                describe("if end field is focused", () => {
                    describe("if <startDate> < <hoveredDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_3;

                        it("shows [<startDate>, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<startDate>, <hoveredDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });

                            it("keeps focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, null] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> < <startDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_1;

                        it("shows [<hoveredDate>, <startDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal(SELECTED_RANGE[0]?.str);
                        });

                        it("moves focus to start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, <startDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[0]?.str);
                            });

                            it("keeps focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, null] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <startDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_2;

                        it("shows [null, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal("");
                        });

                        it("moves focus to start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, null] on click", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal("");
                            });

                            it("keeps focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });

                            describe("if mouse moves to no longer be over a calendar day", () => {
                                it("shows [<startDate>, null] in input fields", async () => {
                                    render(
                                        <DateRangeInput3
                                            {...DATE_FORMAT}
                                            closeOnSelection={false}
                                            defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                        />,
                                    );
                                    const startInput = getStartInputElement();
                                    const endInput = getEndInputElement();

                                    await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                    await userEvent.click(endInput);
                                    await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                    await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                    expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                    expect(endInput.value).to.equal("");

                                    // focus should remain on end input
                                    expect(endInput).to.equal(document.activeElement);
                                });
                            });
                        });
                    });
                });
            });

            describe("when selected date range is [null, <endDate>]", () => {
                const SELECTED_RANGE: NullableRange<HoverTextDateConfig> = [null, HOVER_TEST_DATE_CONFIG_4];

                describe("if start field is focused", () => {
                    describe("if <hoveredDate> < <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_3;

                        it("shows [<hoveredDate>, <endDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, <endDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, null] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <endDate> < <hoveredDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_5;

                        it("shows [<endDate>, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(SELECTED_RANGE[1]?.str);
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("moves focus to end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<endDate>, <hoveredDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[1]?.str);
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [null, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_4;

                        it("shows [null, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal("");
                        });

                        it("moves focus to end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, null] on click", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal("");
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [null, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });
                });

                describe("if end field is focused", () => {
                    describe("if <hoveredDate> < <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_3;

                        it("shows [null, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, <hoveredDate>] on click", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [null, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <endDate> < <hoveredDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_5;

                        it("shows [null, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, <hoveredDate>] on click", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [null, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_4;

                        it("shows [null, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal("");
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, null] on click", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal("");
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [null, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });
                });
            });

            describe("when selected date range is [<startDate>, <endDate>]", () => {
                const SELECTED_RANGE: NullableRange<HoverTextDateConfig> = [
                    HOVER_TEST_DATE_CONFIG_2,
                    HOVER_TEST_DATE_CONFIG_4,
                ];

                describe("if start field is focused", () => {
                    describe("if <hoveredDate> < <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_1;

                        it("shows [<hoveredDate>, <endDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, <endDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <startDate> < <hoveredDate> < <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_3;

                        it("shows [<hoveredDate>, <endDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, <endDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                            });

                            it("keeps focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <endDate> < <hoveredDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_5;

                        it("shows [<hoveredDate>, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(DATE_CONFIG.str);
                            expect(endInput.value).to.equal("");
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<hoveredDate>, null]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(DATE_CONFIG.str);
                                expect(endInput.value).to.equal("");
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <startDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_2;

                        it("shows [null, <endDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                        });

                        it("keeps focus on start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, <endDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                            });

                            it("keep focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_4;

                        it("shows [<startDate>, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                            expect(endInput.value).to.equal("");
                        });

                        it("moves focus to end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(startInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<startDate>, null]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");
                            });

                            it("keeps focus on clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(startInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(startInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should move back to start input
                                expect(startInput).to.equal(document.activeElement);
                            });
                        });
                    });
                });

                describe("if end field is focused", () => {
                    describe("if <hoveredDate> < <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_1;

                        it("shows [null, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, <hoveredDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <startDate> < <hoveredDate> < <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_3;

                        it("shows [<startDate>, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<startDate>, <hoveredDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should remain on end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <endDate> < <hoveredDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_5;

                        it("shows [<startDate>, <hoveredDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                            expect(endInput.value).to.equal(DATE_CONFIG.str);
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<startDate>, <hoveredDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(DATE_CONFIG.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);

                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <startDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_2;

                        it("shows [null, <endDate>] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal("");
                            expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                        });

                        it("moves focus to start field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [null, <endDate>]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal("");
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(getDayElement(DATE_CONFIG.day)).to.equal(document.activeElement);
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should move back to end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });

                    describe("if <hoveredDate> == <endDate>", () => {
                        const DATE_CONFIG = HOVER_TEST_DATE_CONFIG_4;

                        it("shows [<startDate>, null] in input fields", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const startInput = getStartInputElement();
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                            expect(endInput.value).to.equal("");
                        });

                        it("keeps focus on end field", async () => {
                            render(
                                <DateRangeInput3
                                    {...DATE_FORMAT}
                                    closeOnSelection={false}
                                    defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                />,
                            );
                            const endInput = getEndInputElement();

                            await setSelectedRangeForHoverTest(SELECTED_RANGE);
                            await userEvent.click(endInput);
                            await userEvent.hover(getDayElement(DATE_CONFIG.day));

                            expect(endInput).to.equal(document.activeElement);
                        });

                        describe("on click", () => {
                            it("sets selection to [<startDate>, null]", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.click(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal("");
                            });

                            it("moves focus to clicked day button", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);

                                await userEvent.click(getDayElement(DATE_CONFIG.day));
                            });
                        });

                        describe("if mouse moves to no longer be over a calendar day", () => {
                            it("shows [<startDate>, <endDate>] in input fields", async () => {
                                render(
                                    <DateRangeInput3
                                        {...DATE_FORMAT}
                                        closeOnSelection={false}
                                        defaultValue={[HOVER_TEST_DATE_2, HOVER_TEST_DATE_4]}
                                    />,
                                );
                                const startInput = getStartInputElement();
                                const endInput = getEndInputElement();

                                await setSelectedRangeForHoverTest(SELECTED_RANGE);
                                await userEvent.click(endInput);
                                await userEvent.hover(getDayElement(DATE_CONFIG.day));
                                await userEvent.unhover(getDayElement(DATE_CONFIG.day));

                                expect(startInput.value).to.equal(SELECTED_RANGE[0]?.str);
                                expect(endInput.value).to.equal(SELECTED_RANGE[1]?.str);

                                // focus should move back to end input
                                expect(endInput).to.equal(document.activeElement);
                            });
                        });
                    });
                });
            });
        });

        it("Clearing the date range in the picker invokes onChange with [null, null] and clears the inputs", async () => {
            const onChange = sinon.spy();
            const defaultValue = [START_DATE, null] as DateRange;

            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={defaultValue} onChange={onChange} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);
            await userEvent.click(getDayElement(START_DAY));

            expect(startInput.value).to.equal("");
            expect(endInput.value).to.equal("");
            expect(onChange.called).to.be.true;
            expect(onChange.calledWith([null, null])).to.be.true;
        });

        it("Clearing only the start input (e.g.) invokes onChange with [null, <endDate>]", async () => {
            const onChange = sinon.spy();
            render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={DATE_RANGE} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);
            await userEvent.clear(startInput);

            expect(onChange.called).to.be.true;
            expect(onChange.getCall(0).args[0]).to.deep.equal([null, END_DATE]);
            expect(startInput.value).to.equal("");
            expect(endInput.value).to.equal(END_STR);
        });

        it("Clearing the dates in both inputs invokes onChange with [null, null] and leaves the inputs empty", async () => {
            const onChange = sinon.spy();
            render(<DateRangeInput3 {...DATE_FORMAT} onChange={onChange} defaultValue={[START_DATE, null]} />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);
            await userEvent.clear(startInput);

            expect(onChange.called).to.be.true;
            expect(onChange.getCall(0).args[0]).to.deep.equal([null, null]);
            expect(startInput.value).to.equal("");
            expect(endInput.value).to.equal("");
        });
    });

    describe("when controlled", () => {
        it("Setting value causes defaultValue to be ignored", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} defaultValue={DATE_RANGE_2} value={DATE_RANGE} />);
            expect(getStartInputElement().value).to.equal(START_STR);
            expect(getEndInputElement().value).to.equal(END_STR);
        });

        it("Setting value to [undefined, undefined] shows empty fields", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} value={[null, null]} />);
            expect(getStartInputElement().value).to.equal("");
            expect(getEndInputElement().value).to.equal("");
        });

        it("Setting value to [null, null] shows empty fields", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} value={[null, null]} />);
            expect(getStartInputElement().value).to.equal("");
            expect(getEndInputElement().value).to.equal("");
        });

        it("Shows empty start field and formatted date in end field when value is [null, <date>]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} value={[null, END_DATE]} />);
            expect(getStartInputElement().value).to.equal("");
            expect(getEndInputElement().value).to.equal(END_STR);
        });

        it("Shows empty end field and formatted date in start field when value is [<date>, null]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} value={[START_DATE, null]} />);
            expect(getStartInputElement().value).to.equal(START_STR);
            expect(getEndInputElement().value).to.equal("");
        });

        it("Shows formatted dates in both fields when value is [<date1>, <date2>]", () => {
            render(<DateRangeInput3 {...DATE_FORMAT} value={[START_DATE, END_DATE]} />);
            expect(getStartInputElement().value).to.equal(START_STR);
            expect(getEndInputElement().value).to.equal(END_STR);
        });

        it("Updating value changes the text accordingly in both fields", () => {
            const { rerender } = render(<DateRangeInput3 {...DATE_FORMAT} value={DATE_RANGE} />);
            rerender(<DateRangeInput3 {...DATE_FORMAT} value={DATE_RANGE_2} />);
            expect(getStartInputElement().value).to.equal(START_STR_2);
            expect(getEndInputElement().value).to.equal(END_STR_2);
        });

        it("pressing Escape closes the popover", async () => {
            const { container } = render(
                <DateRangeInput3 {...DATE_FORMAT} popoverProps={{ usePortal: false }} value={[null, null]} />,
            );
            const startInput = getStartInputElement();

            await userEvent.click(startInput);

            await waitFor(() => {
                expect(getPopover(container)).to.exist;
            });

            fireEvent.keyDown(startInput, { key: "Escape" });

            await waitFor(() => {
                expect(getPopover(container)).not.to.exist;
            });
        });

        it("Clicking a date invokes onChange with the new date range and updates the input field text", async () => {
            const onChange = sinon.spy();
            render(<DateRangeInput3 {...DATE_FORMAT} value={DATE_RANGE} onChange={onChange} />);
            const startInput = getStartInputElement();

            await userEvent.click(startInput);
            await userEvent.click(getDayElement(START_DAY));

            expect(onChange.called).to.be.true;
            expect(onChange.calledWith([null, END_DATE])).to.be.true;
            expect(onChange.callCount).to.equal(1);
        });

        it("Clicking a start date causes focus to move to the day element", async () => {
            const Wrapper = () => {
                const [value, setValue] = React.useState<DateRange>([null, null]);
                return <DateRangeInput3 {...DATE_FORMAT} onChange={setValue} value={value} />;
            };
            render(<Wrapper />);

            const startInput = getStartInputElement();

            await userEvent.click(startInput);

            const dayElement = getDayElement(1);

            await userEvent.click(dayElement);

            expect(dayElement).to.equal(document.activeElement);
        });

        // Regression test for https://github.com/palantir/blueprint/issues/5791
        it("Hovering and clicking on end date shows the new date in input, not a previously selected date", async () => {
            const DEC_1_DATE = new Date(2022, 11, 1);
            const DEC_1_STR = DATE_FORMAT.formatDate(DEC_1_DATE);
            const DEC_2_DATE = new Date(2022, 11, 2);
            const DEC_2_STR = DATE_FORMAT.formatDate(DEC_2_DATE);
            const DEC_6_DATE = new Date(2022, 11, 6);
            const DEC_6_STR = DATE_FORMAT.formatDate(DEC_6_DATE);
            const DEC_8_DATE = new Date(2022, 11, 8);
            const DEC_8_STR = DATE_FORMAT.formatDate(DEC_8_DATE);

            const Wrapper = () => {
                const [value, setValue] = React.useState<DateRange>([DEC_6_DATE, DEC_8_DATE]);
                return (
                    <DateRangeInput3
                        {...DATE_FORMAT}
                        closeOnSelection={false}
                        onChange={setValue}
                        popoverProps={{ usePortal: false }}
                        value={value}
                    />
                );
            };

            const { container } = render(<Wrapper />);
            const startInput = getStartInputElement();
            const endInput = getEndInputElement();

            await userEvent.click(startInput);

            await waitFor(() => {
                expect(getPopover(container)).to.exist;
            });

            // initial state
            expect(startInput.value).to.equal(DEC_6_STR);
            expect(endInput.value).to.equal(DEC_8_STR);

            // hover over Dec 1
            fireEvent.mouseEnter(getDayElement(1));
            expect(startInput.value).to.equal(DEC_1_STR);
            expect(endInput.value).to.equal(DEC_8_STR);

            // click to select Dec 1
            await userEvent.click(getDayElement(1));
            expect(startInput.value).to.equal(DEC_1_STR);
            expect(endInput.value).to.equal(DEC_8_STR);

            // re-focus on start input to ensure the component doesn't think we're changing the end boundary
            // (this mimics real UX, where the component-refocuses the start input after selecting a start date)
            await userEvent.click(startInput);

            // hover over Dec 2
            fireEvent.mouseEnter(getDayElement(2));
            expect(startInput.value).to.equal(DEC_2_STR);

            // click to select Dec 2
            await userEvent.click(getDayElement(2));
            expect(startInput.value).to.equal(DEC_2_STR);
            expect(endInput.value).to.equal(DEC_8_STR);
        });

        describe("localization", () => {
            describe("with formatDate & parseDate undefined", () => {
                it("formats date strings with provided Locale object", () => {
                    render(<DateRangeInput3 dateFnsFormat="PPP" locale={esLocale} value={DATE_RANGE_2} />);
                    expect(getStartInputElement().value).to.equal(START_STR_2_ES_LOCALE);
                    expect(getEndInputElement().value).to.equal(END_STR_2_ES_LOCALE);
                });

                it("formats date strings with async-loaded locale corresponding to provided locale code", async () => {
                    render(<DateRangeInput3 dateFnsFormat="PPP" locale="es" value={DATE_RANGE_2} />);
                    await waitFor(() => {
                        expect(getStartInputElement().value).to.equal(START_STR_2_ES_LOCALE);
                        expect(getEndInputElement().value).to.equal(END_STR_2_ES_LOCALE);
                    });
                });
            });
        });
    });
});

function getStartInputElement(): HTMLInputElement {
    return screen.getByPlaceholderText<HTMLInputElement>(/start date/i);
}

function getEndInputElement(): HTMLInputElement {
    return screen.getByPlaceholderText<HTMLInputElement>(/end date/i);
}

function getDayElement(dayNumber: number): HTMLButtonElement {
    return screen.getAllByRole<HTMLButtonElement>("gridcell", { name: `${dayNumber}` })[0];
}

function getPopover(container: HTMLElement): HTMLElement | null {
    // HACK - this is brittle, but Popover does not currently expose an accessible way for us to query it in the DOM
    return container.querySelector(`.${CoreClasses.POPOVER}`);
}

function getPastWeekMenuItem(): HTMLElement {
    return screen.getByRole("menuitem", { name: /past week/i });
}
