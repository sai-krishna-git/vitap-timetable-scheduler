// @ts-check

import Select from "react-select";
import "./css/App.css";
import "./css/checkbox.css";
import { inject } from "@vercel/analytics";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from "react-responsive-carousel";
import { TutorialSlide, tutorialSlidesData } from "./components/demo";
import { useAppState } from "./hooks/useAppState";
import {
  getSubjectColorDict,
  isEmpty,
  isInDisabledSlots,
} from "./data/utils";

import React from "react";
import { getData } from "./data";
import WarningIcon from "./assets/icons/warning";
import {
  getCompressedURIFromData,
} from "./data/impls/URI";
import { Link } from "react-router-dom";
import { TimeTable } from "./components/TimeTable";
inject();


function App() {
  const semID = "FALL-2024-25";
  const { subSlotDict, time_table, time_arr, options, getCreditsFromSlot } =
    getData(semID);

  const {
    selecedSubjectsList,
    errorMesssage,
    timeTable,
    pickedSubSlotDict,
    setPickedSubSlotDict,
    blockedTimeSlots,
    setBlockedTimeSlots,
    alreadyPickedTimeTableConfigsArray,
    onSubjectSelectChange,
    calculateCredits,
    submitSubjects,
    onSelectBoxChange,
    updateSubSlotTaken,
    markBlockedTimeSlotsInplace,
    customFilterFn,
  } = useAppState({ semID, subSlotDict, getCreditsFromSlot, time_table });

  calculateCredits();

  const getShareableLink = () => {
    const compressedBase16URI = getCompressedURIFromData(
      timeTable,
      subSlotDict,
    );
    const shareableLink = `/share?v=1&sem=${semID}&data=${compressedBase16URI}`;
    if(navigator.share){
      navigator.share({
        title: "VIT-AP TIME TABLE SCHEDULER",
        text: "Shareable Link",
        url: shareableLink,
      })
      .then(() => {
        console.log("Link shared Successfully");
    })
      .catch((error) => {
        console.log("Erorr Sharing: ",error);
      });
    }
    else{
      alert("Your browser doesn't support the Web Share API");
    }
  };

  const onTimeSlotClick = (/** @type {string} */ timeSlot) => {
    let newBlockedTimeSlots = [];
    let isBlockedTimeSlotRemoved = false;

    // remove the blocked index
    if (blockedTimeSlots.includes(timeSlot)) {
      isBlockedTimeSlotRemoved = true;
      const index = blockedTimeSlots.indexOf(timeSlot);
      newBlockedTimeSlots = blockedTimeSlots.slice();
      newBlockedTimeSlots.splice(index, 1);
    } else {
      // add the timeslot into blocked slots
      newBlockedTimeSlots = [...blockedTimeSlots, timeSlot];
    }

    // update the blocked slots
    setBlockedTimeSlots(newBlockedTimeSlots);

    // update the blocked slot to be a normal slot
    const newPickedSubSlotDict = updateSubSlotTaken(
      selecedSubjectsList,
      newBlockedTimeSlots,
    );

    // updating all the slots in new pickable subjects-slots_list to be not blocked
    const IS_NOT_BLOCKED = 1;
    if (isBlockedTimeSlotRemoved) {
      markBlockedTimeSlotsInplace(
        newPickedSubSlotDict,
        [timeSlot],
        IS_NOT_BLOCKED,
      );
    }

    // update the pickable slots
    setPickedSubSlotDict(newPickedSubSlotDict);

    // generate a new timetable
    submitSubjects(selecedSubjectsList, newPickedSubSlotDict);
  };

  const SubjectSearchBox = (
    <Select
      placeholder="Search the subjects you want to take"
      classNamePrefix="select_subjects"
      defaultValue={selecedSubjectsList}
      onChange={onSubjectSelectChange}
      closeMenuOnSelect={false}
      isMulti
      filterOption={customFilterFn}
      options={options}
      className="basic-multi-select"
    />
  );

  const RefreshButton = (
    <button
      id="refresh-button"
      title="Refresh the Time Table"
      onClick={() => {
        alreadyPickedTimeTableConfigsArray.current.push(timeTable);
        submitSubjects(selecedSubjectsList, pickedSubSlotDict, true);
      }}
    >
      {" "}
      ⟳{" "}
    </button>
  );
  const ShareButton = (<button id="share-button" onClick={getShareableLink}>
  <img 
    src="/share.svg" 
    alt="Share Icon" 
    width="20px" 
    height="20px" 
  />
  <div>Share</div>
  
   </button>
  );

  const CantGenerateTimeTableMessage = (
    <div className="error-message">
      <i>
        {" "}
        <WarningIcon width={25} height={25} />
        {" "}
      </i>
      <h2>{errorMesssage}</h2>
    </div>
  );

  return (
    <>
      <div className="subject-selection-controls">
        {SubjectSearchBox}
      </div>

      <div className="action-buttons">
        
      {RefreshButton}
      {ShareButton}

        
      </div>

      {isEmpty(timeTable)
        ? <Tutorial />
        : (
          <div className="time-table-container">
            {errorMesssage && CantGenerateTimeTableMessage}
            <TimeTable
              time_table={time_table}
              subTimeSlotDict={timeTable}
              subSlotDict={subSlotDict}
              onSlotTap={onTimeSlotClick}
              blockedTimeSlots={blockedTimeSlots}
              time_arr={time_arr}
            />
            <div>
              <h2>Registered Credits: {calculateCredits()}</h2>
            </div>
          </div>
        )}

      <SubjectCheckBoxes
        subSlotDict={subSlotDict}
        pickedSubSlotDict={pickedSubSlotDict}
        onChange={onSelectBoxChange}
        disabledSlots={blockedTimeSlots}
      />
    </>
  );
}

/**
 * @typedef {Object} SubjectCheckBoxesProps
 * @property {Object} subSlotDict
 * @property {Object} pickedSubSlotDict
 * @property {Function} onChange
 * @property {Array} disabledSlots
 * @param {SubjectCheckBoxesProps} props
 * @returns {import("react").ReactNode}
 */
function SubjectCheckBoxes({
  subSlotDict,
  pickedSubSlotDict,
  onChange,
  disabledSlots,
}) {
  const fillAll = (
    /** @type {boolean} */ checked,
    /** @type {boolean[]} */ isSlotTakenBoolenArray,
    /** @type {string} */ subName,
  ) => {
    const placeHolder = [...isSlotTakenBoolenArray];
    placeHolder.fill(checked);
    const newDict = {
      ...pickedSubSlotDict,
      [subName]: placeHolder,
    };
    onChange(newDict);
  };
  const temp_arr = [];
  const subjectNameArr = Object.keys(pickedSubSlotDict);
  const subjectColorDict = getSubjectColorDict(subjectNameArr);
  for (
    const [subName, isSlotTakenBoolenArray] of Object.entries(
      pickedSubSlotDict,
    )
  ) {
    temp_arr.push(
      <div className="subject-checkbox" key={temp_arr.length}>
        <h3
          style={{
            "--data-pre-color": `#${subjectColorDict[subName]}`,
            margin: 0,
            marginTop: "3rem",
          }}
        >
          {subName}
        </h3>
        <div className="select-unselect-div">
          <input
            type="checkbox"
            name="select-all-checkbox"
            id={subName + "Select-All"}
            onChange={(e) => {
              const { checked } = e.target;
              fillAll(checked, isSlotTakenBoolenArray, subName);
            }}
            checked={isSlotTakenBoolenArray.every((isSlotTaken) => isSlotTaken)}
          />
          <label htmlFor={subName}>Select All</label>
          <span className="spacer"></span>
          <input
            type="checkbox"
            name="select-all-checkbox"
            id={subName + "Unselect-all"}
            onChange={(e) => {
              const { checked } = e.target;
              fillAll(!checked, isSlotTakenBoolenArray, subName);
            }}
            checked={isSlotTakenBoolenArray.every(
              (isSlotTaken) => !isSlotTaken,
            )}
          />
          <label htmlFor={subName}>Unselect All</label>
        </div>
        <div id="custom-check-box-grid">
          {isSlotTakenBoolenArray.map((isSlotTaken, i) => (
            <CustomCheckBox
              key={`${subName}-${isSlotTaken}-${i}`}
              // type="checkbox"
              slotLabel={subSlotDict[subName][i]}
              slotId={subSlotDict[subName][i] + subName}
              disabled={isInDisabledSlots(
                subSlotDict[subName][i],
                disabledSlots,
              )}
              checked={isSlotTaken}
              onChange={(e) => {
                const { checked } = e.target;
                const placeHolder = [...isSlotTakenBoolenArray];
                placeHolder[i] = checked;
                const newDict = {
                  ...pickedSubSlotDict,
                  [subName]: placeHolder,
                };
                onChange(newDict);
              }}
            />
          ))}
        </div>
      </div>,
    );
  }

  return <div className="subject-checkboxes">{temp_arr}</div>;
}

function CustomCheckBox({ onChange, checked, slotLabel, slotId, disabled }) {
  return (
    <div className="checkbox-wrapper-4">
      <input
        className="inp-cbx"
        id={slotId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <label className="cbx" htmlFor={slotId}>
        <span>
          <svg width="12px" height="10px">
            <use></use>
          </svg>
        </span>
        <span>{slotLabel}</span>
      </label>
      <svg className="inline-svg">
        <symbol className="check-4">
          <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
        </symbol>
      </svg>
    </div>
  );
}

function Tutorial() {
  return (
    <div className="tutorial">
      <h2>How to use?</h2>
      <p>
        1. Select the subjects you want to take in the dropdown menu you can
        select multiple subjects from the same box
      </p>
      <p>2. You can search by typing the course name (or) course code.</p>
      <p>3. You will see the time table.</p>
      <p>4. Hover over the slot to know the course and it's code</p>

      <Carousel
        showArrows={true}
        autoPlay={true}
        infiniteLoop={true}
        className="carousel-container"
        transitionTime={500}
      >
        {tutorialSlidesData.map((slide) => {
          return (
            <TutorialSlide
              key={slide.imageLink}
              imageLink={slide.imageLink}
              text={slide.text}
            />
          );
        })}
      </Carousel>
    </div>
  );
}

export default App;
