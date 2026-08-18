from backend import run_pipeline


def run_with_email_result(monkeypatch, tmp_path, email_succeeded: bool):
    updates = []
    monkeypatch.setattr(
        run_pipeline,
        "initialize_progress_tracking",
        lambda uid: {
            "pipeline_status": {
                "current_stage": "starting",
                "status": "in_progress",
                "error": None,
                "stages_completed": [],
                "start_time": "now",
                "end_time": None,
            }
        },
    )
    monkeypatch.setattr(
        run_pipeline,
        "process_data_collection",
        lambda *args, **kwargs: ("raw.csv", "storage/raw.csv", None),
    )
    monkeypatch.setattr(
        run_pipeline,
        "process_summary_generation",
        lambda *args, **kwargs: ("<p>Summary</p>", "Transcript", None),
    )
    monkeypatch.setattr(
        run_pipeline,
        "process_email_sending",
        lambda *args, **kwargs: email_succeeded,
    )
    monkeypatch.setattr(
        run_pipeline.utils_firebase,
        "update_data_firestore_DB",
        lambda uid, data: updates.append(data.copy()),
    )
    monkeypatch.setattr(
        run_pipeline.utils_firebase,
        "upload_files_to_firebase_storage",
        lambda **kwargs: None,
    )

    succeeded = run_pipeline.run_flow_for_user(
        uid="user-1",
        email="reader@example.com",
        followers=["example"],
        plan="pro",
        timezone="UTC",
        prompt="Summarize",
        skip_audio=True,
        local_data_dir=str(tmp_path),
    )
    return succeeded, updates


def test_pipeline_reports_failed_email(monkeypatch, tmp_path):
    succeeded, updates = run_with_email_result(
        monkeypatch, tmp_path, email_succeeded=False
    )

    assert succeeded is False
    assert updates[-1]["pipeline_status"]["status"] == "error"


def test_pipeline_reports_successful_completion(monkeypatch, tmp_path):
    succeeded, updates = run_with_email_result(
        monkeypatch, tmp_path, email_succeeded=True
    )

    assert succeeded is True
    assert updates[-1]["pipeline_status"]["current_stage"] == "completed"
