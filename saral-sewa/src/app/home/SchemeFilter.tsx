"use client";

import { useState } from "react";

interface Option {
  id: string;
  label: string;
  badge?: number;
}

interface FilterGroupProps {
  title: string;
  groupKey: string;
  options: Option[];
  state: { [key: string]: boolean };
  onChange: (groupKey: string, itemKey: string, isChecked: boolean) => void;
}


function FilterGroup({
  title,
  groupKey,
  options,
  state,
  onChange,
}: FilterGroupProps) {
  return (
    <div>
      <p className="my-3">{title}</p>
      {options.map((option) => (
        <div key={option.id} className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            value=""
            id={option.id}
            checked={!!state[option.id]}
            onChange={(e) => onChange(groupKey, option.id, e.target.checked)}
          />
          <label className="form-check-label d-flex" htmlFor={option.id}>
            {option.label}{" "}
            {option.badge !== undefined && (
              <span className="badge badge-primary ms-1">{option.badge}</span>
            )}
          </label>
        </div>
      ))}
    </div>
  );
}

interface SchemeFilterProps {
  activeFilter: string | null;
  toggleFilter: (filterName: string) => void;
}

export default function SchemeFilter({
  activeFilter,
  toggleFilter,
}: SchemeFilterProps) {
  // Define filter options as data to pass to the reusable component
  const stateOptions = [
    { id: "delhi", label: "Delhi" },
    { id: "haryana", label: "Haryana" },
    { id: "punjab", label: "Punjab" },
    { id: "uttarpradesh", label: "Uttar Pradesh" },
    { id: "uttarakhand", label: "Uttarakhand" },
    { id: "himachal", label: "Himachal" },
    { id: "chennai", label: "Chennai" },
    { id: "kerela", label: "Kerela" },
    { id: "maharashtra", label: "Maharastra" },
    { id: "andhrapradesh", label: "Andra Pradesh" },
    { id: "arunachalpradesh", label: "Arunachal Pradesh" },
    { id: "assam", label: "Assam" },
    { id: "bihar", label: "Bihar" },
    { id: "chhattisgarh", label: "Chhattisgarh" },
    { id: "goa", label: "Goa" },
    { id: "gujarat", label: "Gujarat" },
    { id: "jharkhand", label: "Jharkhand" },
    { id: "karnataka", label: "Karnataka" },
  ];

  const genderOptions = [
    { id: "allGender", label: "All", badge: 236 },
    { id: "female", label: "Female", badge: 30 },
    { id: "male", label: "Male", badge: 6 },
    { id: "trans", label: "Trans", badge: 1 },
  ];

  const casteOptions = [
    { id: "allCaste", label: "All", badge: 189 },
    { id: "casteSC", label: "SC", badge: 16 },
    { id: "casteST", label: "ST", badge: 13 },
    { id: "casteOBC", label: "OBC", badge: 7 },
    { id: "casteGeneral", label: "General", badge: 7 },
    { id: "castePart", label: "Part...", badge: 8 },
  ];

  const maritalStatusOptions = [
    { id: "maritalAll", label: "All", badge: 236 },
    { id: "maritalWidowed", label: "Widowed", badge: 30 },
    { id: "maritalNeverMarried", label: "Never Married", badge: 6 },
    { id: "maritalDivorced", label: "Divorced", badge: 1 },
  ];

  const residenceOptions = [
    { id: "residenceUrban", label: "Urban" },
    { id: "residenceRural", label: "Rural" },
  ];
  
  const specialCriteriaOptions = [
    { id: "differentlyAbled", label: "Differently Abled" },
    { id: "disabilityPercentage", label: "Disability Percentage" },
    { id: "bpl", label: "Below Poverty Line (BPL)" },
    { id: "economicDistress", label: "Economic Distress" },
  ];
  
  const workStatusOptions = [
    { id: "governmentEmployee", label: "Government emplyee" },
    { id: "student", label: "Student" },
  ];

  const employmentStatusOptions = [
    { id: "unemployed", label: "Unemployed" },
    { id: "selfEmployed", label: "Self-employed" },
    { id: "salaried", label: "Salaried" },
  ];

  const occupationOptions = [
    { id: "farmer", label: "Farmer" },
    { id: "artisan", label: "Artisan" },
    { id: "labourer", label: "Labourer" },
  ];

  const schemeCategoryOptions = [
    { id: "health", label: "Health" },
    { id: "education", label: "Education" },
    { id: "housing", label: "Housing" },
    { id: "womenEmpowerment", label: "Women Empowerment" },
  ];

  const benefitTypeOptions = [
    { id: "financialAssistance", label: "Financial Assistance" },
    { id: "loan", label: "Loan" },
    { id: "skillTraining", label: "Skill Training" },
    { id: "subsidy", label: "Subsidy" },
  ];

  const dbtSchemeOptions = [
    { id: "dbtYes", label: "Yes" },
    { id: "dbtNo", label: "No" },
  ];

  const [basicFilterState, setBasicFilterState] = useState({
    state: {},
    gender: {},
    age: "",
    caste: {},
    maritalStatus: {},
    residence: {},
  });

  const [specialFilterState, setSpecialFilterState] = useState({});
  const [workFilterState, setWorkFilterState] = useState({});
  const [schemeFilterState, setSchemeFilterState] = useState({});

  const handleNestedCheckboxChange = (
    setState: React.Dispatch<React.SetStateAction<any>>,
    state: any,
    groupKey: string,
    itemKey: string,
    isChecked: boolean
  ) => {
    setState({
      ...state,
      [groupKey]: {
        ...state[groupKey],
        [itemKey]: isChecked,
      },
    });
  };

  const handleApplyFilter = () => {
    console.log("Applying filters:", {
      basic: basicFilterState,
      special: specialFilterState,
      work: workFilterState,
      scheme: schemeFilterState,
    });
  };

  const handleResetFilter = () => {
    setBasicFilterState({
      state: {},
      gender: {},
      age: "",
      caste: {},
      maritalStatus: {},
      residence: {},
    });
    setSpecialFilterState({});
    setWorkFilterState({});
    setSchemeFilterState({});
    toggleFilter(activeFilter || "");
  };

  return (
    <div className="position-relative mb-5">
      <div className="filter-wrapper">
        <div className="d-flex align-items-center">
          <a
            className={`nav-link ${activeFilter === "basic" ? "active" : ""}`}
            type="button"
            onClick={() => toggleFilter("basic")}
          >
            Basic information
          </a>
          <a
            className={`nav-link ${activeFilter === "special" ? "active" : ""}`}
            type="button"
            onClick={() => toggleFilter("special")}
          >
            Special Criteria
          </a>
          <a
            className={`nav-link ${activeFilter === "work" ? "active" : ""}`}
            type="button"
            onClick={() => toggleFilter("work")}
          >
            Work Status
          </a>
          <a
            className={`nav-link ${activeFilter === "scheme" ? "active" : ""}`}
            type="button"
            onClick={() => toggleFilter("scheme")}
          >
            Scheme Details
          </a>
          <button
            className="btn btn-outline-primary btn-lg ms-auto"
            onClick={handleResetFilter}
          >
            Reset Filter
          </button>
        </div>
      </div>
      {activeFilter === "basic" && (
        <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
          <div className="filter-wrapper filter-dropdown w-100">
            <div className="row">
              <div className="col-lg-6">
                <FilterGroup
                  title="State"
                  groupKey="state"
                  options={stateOptions}
                  state={basicFilterState.state}
                  onChange={(groupKey, itemKey, isChecked) =>
                    handleNestedCheckboxChange(
                      setBasicFilterState,
                      basicFilterState,
                      groupKey,
                      itemKey,
                      isChecked
                    )
                  }
                />
              </div>
              <div className="col-xl-2 col-lg-3 col-md-6">
                <FilterGroup
                  title="Gender"
                  groupKey="gender"
                  options={genderOptions}
                  state={basicFilterState.gender}
                  onChange={(groupKey, itemKey, isChecked) =>
                    handleNestedCheckboxChange(
                      setBasicFilterState,
                      basicFilterState,
                      groupKey,
                      itemKey,
                      isChecked
                    )
                  }
                />
              </div>
              <div className="col-xl-2 col-lg-3 col-md-6">
                <p className="my-3">Age</p>
                <select
                  name="ageFilter"
                  id="ageFilter"
                  className="form-control"
                  onChange={(e) =>
                    setBasicFilterState({
                      ...basicFilterState,
                      age: e.target.value,
                    })
                  }
                >
                  <option value="0" selected>
                    Select Age
                  </option>
                  {/* Add age ranges here */}
                </select>
              </div>
              <div className="col-xl-2 col-lg-3 col-md-6">
                <FilterGroup
                  title="Caste"
                  groupKey="caste"
                  options={casteOptions}
                  state={basicFilterState.caste}
                  onChange={(groupKey, itemKey, isChecked) =>
                    handleNestedCheckboxChange(
                      setBasicFilterState,
                      basicFilterState,
                      groupKey,
                      itemKey,
                      isChecked
                    )
                  }
                />
              </div>
              <div className="col-lg-2 col-md-6">
                <FilterGroup
                  title="Marital Status"
                  groupKey="maritalStatus"
                  options={maritalStatusOptions}
                  state={basicFilterState.maritalStatus}
                  onChange={(groupKey, itemKey, isChecked) =>
                    handleNestedCheckboxChange(
                      setBasicFilterState,
                      basicFilterState,
                      groupKey,
                      itemKey,
                      isChecked
                    )
                  }
                />
              </div>
              <div className="col-lg-2 col-md-6">
                <FilterGroup
                  title="Residence"
                  groupKey="residence"
                  options={residenceOptions}
                  state={basicFilterState.residence}
                  onChange={(groupKey, itemKey, isChecked) =>
                    handleNestedCheckboxChange(
                      setBasicFilterState,
                      basicFilterState,
                      groupKey,
                      itemKey,
                      isChecked
                    )
                  }
                />
              </div>
              <div className="col-12 py-2 text-end">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleApplyFilter}
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeFilter === "special" && (
        <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
          <div className="filter-wrapper filter-dropdown w-100">
            <div className="row">
              <div className="col-lg-3 col-md-6">
                <FilterGroup
                  title="Special Criteria"
                  groupKey="special"
                  options={specialCriteriaOptions}
                  state={specialFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setSpecialFilterState({ ...specialFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-12 py-2 text-end">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleApplyFilter}
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeFilter === "work" && (
        <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
          <div className="filter-wrapper filter-dropdown w-100">
            <div className="row">
              <div className="col-lg-3 col-md-6">
                <FilterGroup
                  title="Work Status"
                  groupKey="workStatus"
                  options={workStatusOptions}
                  state={workFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setWorkFilterState({ ...workFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-lg-3 col-md-6">
                <FilterGroup
                  title="Employment Status"
                  groupKey="employmentStatus"
                  options={employmentStatusOptions}
                  state={workFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setWorkFilterState({ ...workFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-lg-3 col-md-6">
                <FilterGroup
                  title="Occupation"
                  groupKey="occupation"
                  options={occupationOptions}
                  state={workFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setWorkFilterState({ ...workFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-12 py-2 text-end">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleApplyFilter}
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeFilter === "scheme" && (
        <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
          <div className="filter-wrapper filter-dropdown w-100">
            <div className="row">
              <div className="col-xl-3 col-lg-4 col-md-6">
                <FilterGroup
                  title="Scheme Category"
                  groupKey="category"
                  options={schemeCategoryOptions}
                  state={schemeFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setSchemeFilterState({ ...schemeFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-xl-3 col-lg-4 col-md-6">
                <FilterGroup
                  title="Benefit Type"
                  groupKey="benefitType"
                  options={benefitTypeOptions}
                  state={schemeFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setSchemeFilterState({ ...schemeFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-xl-3 col-lg-4 col-md-6">
                <FilterGroup
                  title="DBT Scheme"
                  groupKey="dbtScheme"
                  options={dbtSchemeOptions}
                  state={schemeFilterState}
                  onChange={(groupKey, itemKey, isChecked) =>
                    setSchemeFilterState({ ...schemeFilterState, [itemKey]: isChecked })
                  }
                />
              </div>
              <div className="col-12 py-2 text-end">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleApplyFilter}
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
