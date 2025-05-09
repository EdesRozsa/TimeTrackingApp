import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Table,
  Badge,
  Card,
  ProgressBar,
  Alert,
  InputGroup,
} from "react-bootstrap";
import "./App.css";
import { TimeEntry, AppSettings } from "./types";

const App: React.FC = () => {
  // State for timer
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [time, setTime] = useState<number>(0);
  const [timerProject, setTimerProject] = useState<string>("");
  const [timerRate, setTimerRate] = useState<number>(40);

  // State for manual entry
  const [manualHours, setManualHours] = useState<number>(0);
  const [manualMinutes, setManualMinutes] = useState<number>(0);
  const [manualProject, setManualProject] = useState<string>("");
  const [manualRate, setManualRate] = useState<number>(40);

  // State for entries
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [sortField, setSortField] = useState<keyof TimeEntry>("dateObj");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  // State for settings
  const [settings, setSettings] = useState<AppSettings>({
    monthlyTargetAmount: 5000, // $2500 in half dollars
    targetRate: 60, // $30 in half dollars
  });

  // State for validation errors
  const [errors, setErrors] = useState<{
    timer?: string;
    manual?: string;
    import?: string;
  }>({});

  // State for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer ref for interval
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const timerStartTime = useRef<Date | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const storedEntries = localStorage.getItem("timeEntries");
    const storedSettings = localStorage.getItem("timeSettings");
    const runningTimer = localStorage.getItem("runningTimer");

    if (storedEntries) {
      try {
        const parsedEntries = JSON.parse(storedEntries);
        // Convert date strings back to Date objects
        const entriesWithDates = parsedEntries.map((entry: TimeEntry) => ({
          ...entry,
          dateObj: new Date(entry.date),
        }));
        setEntries(entriesWithDates);
      } catch (e) {
        console.error("Failed to parse stored entries:", e);
      }
    }

    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error("Failed to parse stored settings:", e);
      }
    }

    if (runningTimer) {
      try {
        const timer = JSON.parse(runningTimer);
        setTimerProject(timer.project);
        setTimerRate(timer.rate);
        timerStartTime.current = new Date(timer.startTime);
        const elapsedTimeMs = Date.now() - new Date(timer.startTime).getTime();
        const elapsedTimeSeconds = Math.floor(elapsedTimeMs / 1000);
        setTime(elapsedTimeSeconds);
        setIsRunning(true);
        startTimer(elapsedTimeSeconds);
      } catch (e) {
        console.error("Failed to restore running timer:", e);
      }
    }
  }, []);

  // Save to localStorage whenever entries or settings change
  useEffect(() => {
    localStorage.setItem("timeEntries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("timeSettings", JSON.stringify(settings));
  }, [settings]);

  // Save timer state when running
  useEffect(() => {
    if (isRunning && timerStartTime.current) {
      localStorage.setItem(
        "runningTimer",
        JSON.stringify({
          project: timerProject,
          rate: timerRate,
          startTime: timerStartTime.current.toISOString(),
        })
      );
    } else if (!isRunning) {
      localStorage.removeItem("runningTimer");
    }
  }, [isRunning, timerProject, timerRate]);

  // Handle window/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning) {
        stopTimer();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRunning]);

  // Timer functions
  const startTimer = (startTime = 0) => {
    if (timerProject.trim() === "") {
      setErrors({ ...errors, timer: "Project name is required" });
      return;
    }

    if (timerProject.length > 80) {
      setErrors({
        ...errors,
        timer: "Project name must be 80 characters or less",
      });
      return;
    }

    if (timerRate < 20 || timerRate > 100) {
      setErrors({ ...errors, timer: "Rate must be between $20 and $100" });
      return;
    }

    setErrors({});

    if (!timerStartTime.current) {
      timerStartTime.current = new Date();
    }

    setIsRunning(true);
    setIsPaused(false);

    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    timerInterval.current = setInterval(() => {
      setTime((prevTime) => prevTime + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setIsPaused(true);
  };

  const resumeTimer = () => {
    startTimer(time);
  };

  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    if (time > 0) {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);

      if (hours > 24) {
        setErrors({
          ...errors,
          timer: "Cannot log more than 24 hours at once",
        });
        return;
      }

      // Add entry
      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        projectName: timerProject,
        hours,
        minutes,
        rate: timerRate,
        date: new Date().toISOString(),
        dateObj: new Date(),
      };

      setEntries((prevEntries) => [newEntry, ...prevEntries]);
    }

    // Reset timer
    setTime(0);
    setIsRunning(false);
    setIsPaused(false);
    timerStartTime.current = null;
  };

  // Format time for display
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle manual entry
  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (manualProject.trim() === "") {
      setErrors({ ...errors, manual: "Project name is required" });
      return;
    }

    if (manualProject.length > 80) {
      setErrors({
        ...errors,
        manual: "Project name must be 80 characters or less",
      });
      return;
    }

    if (manualHours > 24) {
      setErrors({ ...errors, manual: "Cannot log more than 24 hours at once" });
      return;
    }

    if (manualMinutes > 59) {
      setErrors({ ...errors, manual: "Minutes must be between 0 and 59" });
      return;
    }

    if (manualRate < 20 || manualRate > 100) {
      setErrors({ ...errors, manual: "Rate must be between $20 and $100" });
      return;
    }

    if (manualHours === 0 && manualMinutes === 0) {
      setErrors({ ...errors, manual: "Duration must be greater than zero" });
      return;
    }

    setErrors({});

    // Add entry
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      projectName: manualProject,
      hours: manualHours,
      minutes: manualMinutes,
      rate: manualRate,
      date: new Date().toISOString(),
      dateObj: new Date(),
    };

    setEntries((prevEntries) => [newEntry, ...prevEntries]);

    // Reset form
    setManualHours(0);
    setManualMinutes(0);
    setManualProject("");
    setManualRate(40);
  };

  // Sort entries
  const sortEntries = (field: keyof TimeEntry) => {
    const newDirection =
      field === sortField && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);
  };

  const getSortedEntries = () => {
    return [...entries].sort((a, b) => {
      if (sortField === "dateObj") {
        return sortDirection === "asc"
          ? a.dateObj.getTime() - b.dateObj.getTime()
          : b.dateObj.getTime() - a.dateObj.getTime();
      }

      if (
        sortField === "hours" ||
        sortField === "minutes" ||
        sortField === "rate"
      ) {
        return sortDirection === "asc"
          ? a[sortField] - b[sortField]
          : b[sortField] - a[sortField];
      }

      if (sortField === "projectName") {
        return sortDirection === "asc"
          ? a.projectName.localeCompare(b.projectName)
          : b.projectName.localeCompare(a.projectName);
      }

      return 0;
    });
  };

  // Handle entry selection
  const toggleSelectEntry = (id: string) => {
    setSelectedEntries((prev) =>
      prev.includes(id)
        ? prev.filter((entryId) => entryId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries.map((entry) => entry.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle entry deletion
  const deleteSelectedEntries = () => {
    setEntries((prev) =>
      prev.filter((entry) => !selectedEntries.includes(entry.id))
    );
    setSelectedEntries([]);
    setSelectAll(false);
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setSelectedEntries((prev) => prev.filter((entryId) => entryId !== id));
  };

  // Handle entry editing
  const startEditing = (entry: TimeEntry) => {
    // Clear any existing errors first
    setErrors({});
    
    // Set editing state
    setEditingEntry(entry.id);
    setManualHours(entry.hours);
    setManualMinutes(entry.minutes);
    setManualProject(entry.projectName);
    setManualRate(entry.rate);
    
    // Scroll to the editing form
    setTimeout(() => {
      const editForm = document.querySelector('.manual-entry-section');
      if (editForm) {
        editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const saveEdit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validation
    if (manualProject.trim() === "") {
      setErrors({ ...errors, manual: "Project name is required" });
      return;
    }

    if (manualProject.length > 80) {
      setErrors({
        ...errors,
        manual: "Project name must be 80 characters or less",
      });
      return;
    }

    if (manualHours > 24) {
      setErrors({ ...errors, manual: "Cannot log more than 24 hours at once" });
      return;
    }

    if (manualMinutes > 59) {
      setErrors({ ...errors, manual: "Minutes must be between 0 and 59" });
      return;
    }

    if (manualRate < 20 || manualRate > 100) {
      setErrors({ ...errors, manual: "Rate must be between $20 and $100" });
      return;
    }

    if (manualHours === 0 && manualMinutes === 0) {
      setErrors({ ...errors, manual: "Duration must be greater than zero" });
      return;
    }

    setErrors({});

    if (editingEntry) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingEntry
            ? {
                ...entry,
                projectName: manualProject,
                hours: manualHours,
                minutes: manualMinutes,
                rate: manualRate,
              }
            : entry
        )
      );

      cancelEdit();
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setManualHours(0);
    setManualMinutes(0);
    setManualProject("");
    setManualRate(40);
    setErrors({}); // Clear any errors
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Project Name", "Hours", "Minutes", "Rate", "Date"];
    const csvContent = entries.map(
      (entry) =>
        `"${entry.projectName.replace(/"/g, '""')}",${entry.hours},${
          entry.minutes
        },${entry.rate},"${new Date(entry.dateObj).toLocaleString()}"`
    );

    const csv = [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `time-entries-${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import from CSV
  const importFromCSV = (wipeExisting: boolean = false) => {
    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n");

          // Skip header
          const dataLines = lines.slice(1).filter((line) => line.trim() !== "");

          const importedEntries: TimeEntry[] = dataLines.map((line, index) => {
            // Handle CSV with quoted fields properly
            const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

            if (!matches || matches.length < 5) {
              throw new Error(`Invalid CSV format at line ${index + 2}`);
            }

            const projectName = matches[0]
              .replace(/^"|"$/g, "")
              .replace(/""/g, '"');
            const hours = parseInt(matches[1], 10);
            const minutes = parseInt(matches[2], 10);
            const rate = parseFloat(matches[3]);
            const dateStr = matches[4].replace(/^"|"$/g, "");
            const dateObj = new Date(dateStr);

            // Validate
            if (isNaN(hours) || hours < 0 || hours > 24) {
              throw new Error(
                `Invalid hours at line ${index + 2}: must be between 0 and 24`
              );
            }

            if (isNaN(minutes) || minutes < 0 || minutes > 59) {
              throw new Error(
                `Invalid minutes at line ${index + 2}: must be between 0 and 59`
              );
            }

            if (isNaN(rate) || rate < 20 || rate > 100) {
              throw new Error(
                `Invalid rate at line ${
                  index + 2
                }: must be between $20 and $100`
              );
            }

            if (isNaN(dateObj.getTime())) {
              throw new Error(`Invalid date at line ${index + 2}`);
            }

            return {
              id: `imported-${Date.now()}-${index}`,
              projectName,
              hours,
              minutes,
              rate,
              date: dateObj.toISOString(),
              dateObj,
            };
          });

          setEntries((prev) =>
            wipeExisting ? importedEntries : [...importedEntries, ...prev]
          );
          setErrors({});

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          setErrors({ ...errors, import: (error as Error).message });
        }
      };

      reader.readAsText(file);
    } else {
      setErrors({ ...errors, import: "Please select a CSV file" });
    }
  };

  // Handle settings change
  const handleSettingChange = (field: keyof AppSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate statistics
  const calculateStats = () => {
    // Total hours and minutes
    let totalHours = 0;
    let totalMinutes = 0;
    let totalBilled = 0;

    entries.forEach((entry) => {
      totalHours += entry.hours;
      totalMinutes += entry.minutes;

      // Convert time to hours for billing calculation
      const entryHours = entry.hours + entry.minutes / 60;
      totalBilled += entryHours * entry.rate;
    });

    // Adjust minutes overflow
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;

    // Target calculations
    const targetHours = settings.monthlyTargetAmount / settings.targetRate;
    const targetHoursWhole = Math.floor(targetHours);
    const targetMinutes = Math.round((targetHours - targetHoursWhole) * 60);

    // Hours left at target rate
    const workedHours = totalHours + totalMinutes / 60;
    const hoursLeftAtTarget = Math.max(0, targetHours - workedHours);
    const hoursLeftAtTargetWhole = Math.floor(hoursLeftAtTarget);
    const minutesLeftAtTarget = Math.round(
      (hoursLeftAtTarget - hoursLeftAtTargetWhole) * 60
    );

    // Current average rate
    const avgRate = workedHours > 0 ? totalBilled / workedHours : 0;

    // Hours left at average rate
    const hoursLeftAtAvg =
      avgRate > 0
        ? Math.max(0, (settings.monthlyTargetAmount - totalBilled) / avgRate)
        : 0;
    const hoursLeftAtAvgWhole = Math.floor(hoursLeftAtAvg);
    const minutesLeftAtAvg = Math.round(
      (hoursLeftAtAvg - hoursLeftAtAvgWhole) * 60
    );

    // Progress percentage
    const progressPercent = Math.min(
      100,
      (totalBilled / settings.monthlyTargetAmount) * 100
    );

    return {
      totalHours,
      totalMinutes,
      totalBilled,
      targetHours: targetHoursWhole,
      targetMinutes,
      hoursLeftAtTarget: hoursLeftAtTargetWhole,
      minutesLeftAtTarget,
      avgRate,
      hoursLeftAtAvg: hoursLeftAtAvgWhole,
      minutesLeftAtAvg,
      progressPercent,
    };
  };

  const stats = calculateStats();

  return (
    <Container className="app-container">
      <h1 className="my-4">Time Tracker</h1>

      <Row>
        <Col lg={6} className="mb-4">
          {/* Timer Section */}
          <div className="timer-section">
            <h2>Timer</h2>
            <div
              className="timer-display"
              aria-live="polite"
              aria-label="Timer displaying hours, minutes, and seconds"
            >
              {formatTime(time)}
            </div>

            <Form>
              <Row className="mb-3">
                <Col md={8}>
                  <Form.Group controlId="timerProject">
                    <Form.Label>Project/Client Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter project name"
                      value={timerProject}
                      onChange={(e) => setTimerProject(e.target.value)}
                      maxLength={80}
                      disabled={isRunning}
                      aria-describedby="projectNameHelp"
                    />
                    <Form.Text id="projectNameHelp" className="text-muted">
                      Max 80 characters
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="timerRate">
                    <Form.Label>Billing Rate ($)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Rate"
                      value={timerRate}
                      onChange={(e) => setTimerRate(Number(e.target.value))}
                      min={20}
                      max={100}
                      disabled={isRunning}
                      aria-describedby="rateHelp"
                    />
                    <Form.Text id="rateHelp" className="text-muted">
                      $20-$100
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {errors.timer && <Alert variant="danger">{errors.timer}</Alert>}

              <div className="timer-controls">
                {!isRunning ? (
                  <Button
                    variant="success"
                    onClick={() => startTimer()}
                    className="flex-grow-1"
                    aria-label="Start timer"
                  >
                    Start
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button
                        variant="warning"
                        onClick={pauseTimer}
                        className="flex-grow-1"
                        aria-label="Pause timer"
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="info"
                        onClick={resumeTimer}
                        className="flex-grow-1"
                        aria-label="Resume timer"
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={stopTimer}
                      className="flex-grow-1"
                      aria-label="Stop timer and save entry"
                    >
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </Form>
          </div>

          {/* Manual Entry Section */}
          <div className="manual-entry-section">
            <h2>{editingEntry ? "Edit Entry" : "Add Time Entry Manually"}</h2>

            <Form onSubmit={editingEntry ? saveEdit : handleManualEntry}>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="manualProject">
                    <Form.Label>Project/Client Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter project name"
                      value={manualProject}
                      onChange={(e) => setManualProject(e.target.value)}
                      maxLength={80}
                      aria-describedby="manualProjectHelp"
                    />
                    <Form.Text id="manualProjectHelp" className="text-muted">
                      Max 80 characters
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="manualRate">
                    <Form.Label>Billing Rate ($)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Rate"
                      value={manualRate}
                      onChange={(e) => setManualRate(Number(e.target.value))}
                      min={20}
                      max={100}
                      aria-describedby="manualRateHelp"
                    />
                    <Form.Text id="manualRateHelp" className="text-muted">
                      $20-$100
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="manualHours">
                    <Form.Label>Hours</Form.Label>
                    <Form.Control
                      type="number"
                      value={manualHours}
                      onChange={(e) => setManualHours(Number(e.target.value))}
                      min={0}
                      max={24}
                      aria-describedby="manualHoursHelp"
                    />
                    <Form.Text id="manualHoursHelp" className="text-muted">
                      0-24 hours
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="manualMinutes">
                    <Form.Label>Minutes</Form.Label>
                    <Form.Control
                      type="number"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(Number(e.target.value))}
                      min={0}
                      max={59}
                      aria-describedby="manualMinutesHelp"
                    />
                    <Form.Text id="manualMinutesHelp" className="text-muted">
                      0-59 minutes
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {errors.manual && <Alert variant="danger">{errors.manual}</Alert>}

              <div className="d-flex gap-2">
                {editingEntry ? (
                  <>
                    <Button
                      variant="success"
                      type="submit"
                      aria-label="Save changes"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={cancelEdit}
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    type="submit"
                    aria-label="Add time entry"
                  >
                    Add Entry
                  </Button>
                )}
              </div>
            </Form>
          </div>

          {/* Target Settings Section */}
          <div className="stats-section">
            <h2>Monthly Targets</h2>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="monthlyTarget">
                  <Form.Label>Monthly Target ($)</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.monthlyTargetAmount / 2} // Convert from half dollars to dollars
                    onChange={(e) =>
                      handleSettingChange(
                        "monthlyTargetAmount",
                        Number(e.target.value) * 2
                      )
                    }
                    min={0}
                    aria-label="Monthly target amount in dollars"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="targetRate">
                  <Form.Label>Target Rate ($/hour)</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.targetRate / 2} // Convert from half dollars to dollars
                    onChange={(e) =>
                      handleSettingChange(
                        "targetRate",
                        Number(e.target.value) * 2
                      )
                    }
                    min={20}
                    max={100}
                    aria-label="Target hourly rate in dollars"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Col>

        <Col lg={6} className="mb-4">
          {/* Stats Section */}
          <div className="stats-section">
            <h2>Statistics</h2>

            <ProgressBar
              now={stats.progressPercent}
              variant={stats.progressPercent >= 100 ? "success" : "primary"}
              className="mb-3"
              aria-label={`Progress toward monthly target: ${stats.progressPercent.toFixed(
                1
              )}%`}
            />

            <Row className="mb-4">
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <Card.Title as="h3">Time Worked</Card.Title>
                    <div className="d-flex flex-column">
                      <div className="mb-2">
                        <span>Total Hours: </span>
                        <span className="stats-value">
                          {stats.totalHours}h {stats.totalMinutes}m
                        </span>
                      </div>
                      <div>
                        <span>Amount Billed: </span>
                        <span className="stats-value">
                          ${(stats.totalBilled / 2).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <Card.Title as="h3">Target</Card.Title>
                    <div className="d-flex flex-column">
                      <div className="mb-2">
                        <span>Monthly Goal: </span>
                        <span className="stats-value">
                          ${(settings.monthlyTargetAmount / 2).toFixed(2)}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span>Target Rate: </span>
                        <span className="stats-value">
                          ${(settings.targetRate / 2).toFixed(2)}/hour
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <Card.Title as="h3">At Target Rate</Card.Title>
                    <div className="d-flex flex-column">
                      <div className="mb-2">
                        <span>Target Hours: </span>
                        <span className="stats-value">
                          {stats.targetHours}h {stats.targetMinutes}m
                        </span>
                      </div>
                      <div>
                        <span>Hours Left: </span>
                        <span className="stats-value">
                          {stats.hoursLeftAtTarget}h {stats.minutesLeftAtTarget}
                          m
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <Card.Title as="h3">At Current Avg Rate</Card.Title>
                    <div className="d-flex flex-column">
                      <div className="mb-2">
                        <span>Average Rate: </span>
                        <span className="stats-value">
                          ${(stats.avgRate / 2).toFixed(2)}/hour
                        </span>
                      </div>
                      <div>
                        <span>Hours Left: </span>
                        <span className="stats-value">
                          {stats.hoursLeftAtAvg}h {stats.minutesLeftAtAvg}m
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      {/* Entries Section */}
      <div className="entries-section">
        <div className="entries-header">
          <h2>Time Entries</h2>

          <div className="d-flex align-items-center gap-2">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="d-none"
              aria-label="Import CSV file"
              onChange={() => {}}
            />
            {selectedEntries.length > 0 && (
              <Button
                variant="danger"
                onClick={deleteSelectedEntries}
                aria-label={`Delete ${selectedEntries.length} selected entries`}
              >
                Delete Selected ({selectedEntries.length})
              </Button>
            )}
          </div>
        </div>

        <div className="data-actions mb-3">
          <Button
            variant="primary"
            onClick={exportToCSV}
            className="action-btn"
            aria-label="Export entries to CSV file"
          >
            Export to CSV
          </Button>
          <Button
            variant="info"
            onClick={() => fileInputRef.current?.click()}
            className="action-btn"
            aria-label="Import entries from CSV file"
          >
            Import from CSV
          </Button>
          <Button
            variant="warning"
            onClick={() => {
              exportToCSV();
              setEntries([]);
              setSelectedEntries([]);
              setSelectAll(false);
            }}
            className="action-btn"
            aria-label="Export entries to CSV and clear data"
          >
            Download & Clear
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (fileInputRef.current?.files?.length) {
                importFromCSV(true);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="action-btn"
            aria-label="Clear data and import from CSV"
          >
            Clear & Import
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to delete all entries? This cannot be undone."
                )
              ) {
                setEntries([]);
                setSelectedEntries([]);
                setSelectAll(false);
              }
            }}
            className="action-btn"
            aria-label="Delete all entries"
          >
            Clear All Data
          </Button>
        </div>

        {errors.import && <Alert variant="danger">{errors.import}</Alert>}

        {entries.length === 0 ? (
          <Alert variant="info">
            No time entries yet. Start the timer or add entries manually.
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>
                    <Form.Check
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      aria-label="Select all entries"
                    />
                  </th>
                  <th
                    role="button"
                    onClick={() => sortEntries("dateObj")}
                    aria-label="Sort by date"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        sortEntries("dateObj");
                        e.preventDefault();
                      }
                    }}
                  >
                    Date
                    <span className="sort-icon">
                      {sortField === "dateObj" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                  </th>
                  <th
                    role="button"
                    onClick={() => sortEntries("projectName")}
                    aria-label="Sort by project name"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        sortEntries("projectName");
                        e.preventDefault();
                      }
                    }}
                  >
                    Project
                    <span className="sort-icon">
                      {sortField === "projectName" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                  </th>
                  <th
                    role="button"
                    onClick={() => sortEntries("hours")}
                    aria-label="Sort by duration"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        sortEntries("hours");
                        e.preventDefault();
                      }
                    }}
                  >
                    Duration
                    <span className="sort-icon">
                      {sortField === "hours" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                  </th>
                  <th
                    role="button"
                    onClick={() => sortEntries("rate")}
                    aria-label="Sort by rate"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        sortEntries("rate");
                        e.preventDefault();
                      }
                    }}
                  >
                    Rate
                    <span className="sort-icon">
                      {sortField === "rate" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                  </th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedEntries().map((entry) => (
                  <tr
                    key={entry.id}
                    className={
                      selectedEntries.includes(entry.id) ? "selected-row" : ""
                    }
                  >
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={selectedEntries.includes(entry.id)}
                        onChange={() => toggleSelectEntry(entry.id)}
                        aria-label={`Select entry for ${entry.projectName}`}
                      />
                    </td>
                    <td>{new Date(entry.dateObj).toLocaleString()}</td>
                    <td>{entry.projectName}</td>
                    <td>
                      {entry.hours}h {entry.minutes}m
                    </td>
                    <td>${(entry.rate / 2).toFixed(2)}</td>
                    <td>
                      $
                      {(
                        (entry.hours + entry.minutes / 60) *
                        (entry.rate / 2)
                      ).toFixed(2)}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => startEditing(entry)}
                          className="me-1"
                          aria-label={`Edit entry for ${entry.projectName}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => deleteEntry(entry.id)}
                          aria-label={`Delete entry for ${entry.projectName}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </Container>
  );
};

export default App;
