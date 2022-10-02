use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DistanceInfo
{
    pub min : f32,
    pub max : f32,
    pub mean : f32,
    pub median : f32,
}

#[derive(Debug, Serialize)]
pub struct ClueTelemetry
{
    pub word : String,
    pub correct_distance_info : DistanceInfo,
    pub incorrect_distance_info : Vec<DistanceInfo>,
    pub correctness : CorrectState,
}

#[derive(Debug, Serialize)]
pub enum CorrectState {
    NotGuessed,
    Correct,
    Incorrect,
}

#[derive(Debug, Default, Serialize)]
pub struct TurnTelemetry
{
    pub clues : Vec<ClueTelemetry>,
}

#[derive(Debug, Default, Serialize)]
pub struct TelemetryData
{
    pub hidden_words : Vec<String>,
    pub turns : Vec<TurnTelemetry>,
}