use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DistanceInfo
{
    pub min : f32,
    pub max : f32,
    pub mean : f32,
    pub median : f32,
}

impl DistanceInfo
{
    pub fn from_distances(mut distances: Vec<f32>) -> Self {
        distances.sort_by(|x, y| x.total_cmp(&y));

        let median = distances[distances.len() / 2];

        let min = distances[0];
        let max = distances[distances.len() - 1];

        let mut mean = 0.0;
        for dist in &distances {
            mean += dist;
        }

        mean /= distances.len() as f32;

        DistanceInfo {
            min,
            max,
            mean,
            median,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ClueTelemetry
{
    pub word : String,

    pub distance_to_hidden_word : f32,
    pub distance_to_other_hidden_words : DistanceInfo,

    pub correct_distance_info : Option<DistanceInfo>,
    pub incorrect_distance_info : Vec<Option<DistanceInfo>>,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distance_info_single()
    {
        let ds = vec![
            0.5,
        ];

        let info = DistanceInfo::from_distances(ds);
        assert_eq!(info.min, 0.5);
        assert_eq!(info.max, 0.5);
        assert_eq!(info.median, 0.5);
        assert_eq!(info.mean, 0.5);
    }

    #[test]
    fn distance_info_multiple()
    {
        let ds = vec![
            0.0,
            0.5,
            1.0,
        ];

        let info = DistanceInfo::from_distances(ds);
        assert_eq!(info.min, 0.0);
        assert_eq!(info.max, 1.0);
        assert_eq!(info.median, 0.5);
        assert_eq!(info.mean, 0.5);
    }

    #[test]
    fn distance_info_multiple_2()
    {
        let ds = vec![
            0.0,
            0.75,
            1.0,
        ];

        let info = DistanceInfo::from_distances(ds);
        assert_eq!(info.min, 0.0);
        assert_eq!(info.max, 1.0);
        assert_eq!(info.median, 0.75);
        assert_eq!(info.mean, 0.5833333);
    }
}