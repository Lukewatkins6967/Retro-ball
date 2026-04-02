using UnityEngine;

public class Commentary : Singleton<Commentary>
{
	public enum eCommentaryTrigger
	{
		Null = 0,
		JumpshotAttemptTwo = 1,
		JumpshotAttemptThree = 2,
		JumpshotSuccess = 3,
		JumpshotMissed = 4,
		DunkAttempt = 5,
		DunkSuccess = 6,
		Idle = 7,
		GameStart = 8,
		GameEnd = 9,
		ChangePossession = 10,
		Violence = 11,
		BlockViolence = 12
	}

	private AudioSource m_playing;

	[SerializeField]
	private eCommentaryTrigger m_currentlyPlayingTrigger;

	[SerializeField]
	private eCommentaryTrigger m_queuedTrigger;

	[SerializeField]
	private bool m_retardLouisDebugText;

	private float m_timeInQueue;

	[SerializeField]
	private float m_maxQueueTime = 3f;

	private float m_timeSinceIdleCommentary;

	[SerializeField]
	private float m_minTimeSinceIdleCommentary = 30f;

	[Header("Jumpshot Attempt Two Points")]
	[SerializeField]
	private AudioCue m_jumpshotAttemptTwoAudioCue;

	[Range(0f, 1f)]
	[SerializeField]
	private float m_jumpshotAttemptTwoChance;

	[SerializeField]
	[Header("Jumpshot Attempt Three Points")]
	private AudioCue m_jumpshotAttemptThreeAudioCue;

	[SerializeField]
	[Range(0f, 1f)]
	private float m_jumpshotAttemptThreeChance;

	[SerializeField]
	[Header("Jumpshot Success")]
	private AudioCue m_jumpshotSuccessAudioCue;

	[Range(0f, 1f)]
	[SerializeField]
	private float m_jumpshotSuccessChance;

	[SerializeField]
	[Header("Jumpshot Missed")]
	private AudioCue m_jumpshotMissedAudioCue;

	[Range(0f, 1f)]
	[SerializeField]
	private float m_jumpshotMissedChance;

	[Header("Dunk Attempt")]
	[SerializeField]
	private AudioCue m_dunkAttemptAudioCue;

	[Range(0f, 1f)]
	[SerializeField]
	private float m_dunkAttemptChance;

	[SerializeField]
	[Header("Dunk Success")]
	private AudioCue m_dunkSuccessAudioCue;

	[SerializeField]
	[Range(0f, 1f)]
	private float m_dunkSuccessChance;

	[Header("Idle")]
	[SerializeField]
	private AudioCue m_idleAudioCue;

	[SerializeField]
	[Range(0f, 1f)]
	private float m_idleChance;

	[SerializeField]
	[Header("Game Start")]
	private AudioCue m_gameStartAudioCue;

	[Range(0f, 1f)]
	[SerializeField]
	private float m_gameStartChance;

	[SerializeField]
	[Header("Game End")]
	private AudioCue m_gameEndAudioCue;

	[SerializeField]
	[Range(0f, 1f)]
	private float m_gameEndChance;

	[SerializeField]
	[Header("Change Possession")]
	private AudioCue m_changePossessionAudioCue;

	[Range(0f, 1f)]
	[SerializeField]
	private float m_changePossessionChance;

	[Header("Violence")]
	[SerializeField]
	private AudioCue m_violenceAudioCue;

	[SerializeField]
	[Range(0f, 1f)]
	private float m_violenceChance;

	[SerializeField]
	[Header("Block Violence")]
	private AudioCue m_blockViolenceAudioCue;

	[SerializeField]
	[Range(0f, 1f)]
	private float m_blockViolenceChance;

	private void Awake()
	{
		SetSingleton();
	}

	private void Start()
	{
	}

	private void Update()
	{
		if (m_playing != null)
		{
			if (!m_playing.isPlaying)
			{
				m_playing = null;
				m_currentlyPlayingTrigger = eCommentaryTrigger.Null;
			}
		}
		else if (Singleton<SystemGame>.Get.GetPlayTimer() > 30f)
		{
			m_timeSinceIdleCommentary += Time.deltaTime;
			if (m_timeSinceIdleCommentary > m_minTimeSinceIdleCommentary)
			{
				if (PlayCommentary(eCommentaryTrigger.Idle))
				{
					m_timeSinceIdleCommentary = GetPlayingAudioClipLength() * -1f;
				}
				else
				{
					m_timeSinceIdleCommentary = 0f;
				}
			}
		}
		if (m_queuedTrigger == eCommentaryTrigger.Null)
		{
			return;
		}
		m_timeInQueue += Time.deltaTime;
		if (m_retardLouisDebugText)
		{
			Debug.Log("Time in queue: " + m_timeInQueue);
		}
		if (m_timeInQueue > m_maxQueueTime)
		{
			if (m_retardLouisDebugText)
			{
				Debug.Log(string.Concat("Queued Commentary (", m_queuedTrigger, ") Timed Out!"));
			}
			m_queuedTrigger = eCommentaryTrigger.Null;
			m_timeInQueue = 0f;
		}
		else if (m_playing == null)
		{
			if (m_retardLouisDebugText)
			{
				Debug.Log(string.Concat("Attempting to play queued commentary (", m_queuedTrigger, ")"));
			}
			PlayCommentary(m_queuedTrigger);
			m_queuedTrigger = eCommentaryTrigger.Null;
			m_timeInQueue = 0f;
		}
	}

	public bool PlayCommentary(eCommentaryTrigger trigger)
	{
		if (m_playing == null)
		{
			float chanceByTrigger = GetChanceByTrigger(trigger);
			float num = Random.Range(0f, 0.99f);
			if (m_retardLouisDebugText)
			{
				Debug.Log(string.Concat(trigger, ", threshold: ", chanceByTrigger, ", random number: ", num));
			}
			if (chanceByTrigger > num)
			{
				AudioCue audioCueByTrigger = GetAudioCueByTrigger(trigger);
				if (audioCueByTrigger != null)
				{
					if (m_retardLouisDebugText)
					{
						Debug.Log("Playing commentary: " + trigger);
					}
					m_playing = SystemAudio.Play(audioCueByTrigger);
					m_currentlyPlayingTrigger = trigger;
					return true;
				}
			}
			else if (m_retardLouisDebugText)
			{
				Debug.Log(string.Concat(trigger, " not played, below chance threshold"));
			}
		}
		else if (QueueThisTrigger(trigger))
		{
			if (m_retardLouisDebugText)
			{
				Debug.Log(string.Concat("queueing ", trigger, ", ", m_currentlyPlayingTrigger, " is playing"));
			}
			m_queuedTrigger = trigger;
		}
		return false;
	}

	public float GetPlayingAudioClipLength()
	{
		if (m_playing == null)
		{
			return 0f;
		}
		return m_playing.clip.length;
	}

	public bool GetIsCurrentlyPlaying()
	{
		return m_currentlyPlayingTrigger != eCommentaryTrigger.Null;
	}

	public float GetCurrentlyPlayingTimeFromEnd()
	{
		if (!GetIsCurrentlyPlaying() || m_playing == null || !m_playing.isPlaying)
		{
			return 0f;
		}
		return m_playing.clip.length - m_playing.time;
	}

	private float GetChanceByTrigger(eCommentaryTrigger trigger)
	{
		switch (trigger)
		{
		case eCommentaryTrigger.JumpshotAttemptTwo:
			return m_jumpshotAttemptTwoChance;
		case eCommentaryTrigger.JumpshotAttemptThree:
			return m_jumpshotAttemptThreeChance;
		case eCommentaryTrigger.JumpshotSuccess:
			return m_jumpshotSuccessChance;
		case eCommentaryTrigger.JumpshotMissed:
			return m_jumpshotMissedChance;
		case eCommentaryTrigger.DunkAttempt:
			return m_dunkAttemptChance;
		case eCommentaryTrigger.DunkSuccess:
			return m_dunkSuccessChance;
		case eCommentaryTrigger.Idle:
			return m_idleChance;
		case eCommentaryTrigger.GameStart:
			return m_gameStartChance;
		case eCommentaryTrigger.GameEnd:
			return m_gameEndChance;
		case eCommentaryTrigger.ChangePossession:
			return m_changePossessionChance;
		case eCommentaryTrigger.Violence:
			return m_violenceChance;
		case eCommentaryTrigger.BlockViolence:
			return m_blockViolenceChance;
		default:
			return 0f;
		}
	}

	private AudioCue GetAudioCueByTrigger(eCommentaryTrigger trigger)
	{
		switch (trigger)
		{
		case eCommentaryTrigger.JumpshotAttemptTwo:
			return m_jumpshotAttemptTwoAudioCue;
		case eCommentaryTrigger.JumpshotAttemptThree:
			return m_jumpshotAttemptThreeAudioCue;
		case eCommentaryTrigger.JumpshotSuccess:
			return m_jumpshotSuccessAudioCue;
		case eCommentaryTrigger.JumpshotMissed:
			return m_jumpshotMissedAudioCue;
		case eCommentaryTrigger.DunkAttempt:
			return m_dunkAttemptAudioCue;
		case eCommentaryTrigger.DunkSuccess:
			return m_dunkSuccessAudioCue;
		case eCommentaryTrigger.Idle:
			return m_idleAudioCue;
		case eCommentaryTrigger.GameStart:
			return m_gameStartAudioCue;
		case eCommentaryTrigger.GameEnd:
			return m_gameEndAudioCue;
		case eCommentaryTrigger.ChangePossession:
			return m_changePossessionAudioCue;
		case eCommentaryTrigger.Violence:
			return m_violenceAudioCue;
		case eCommentaryTrigger.BlockViolence:
			return m_blockViolenceAudioCue;
		default:
			return null;
		}
	}

	private bool QueueThisTrigger(eCommentaryTrigger trigger)
	{
		if (trigger == m_currentlyPlayingTrigger)
		{
			return false;
		}
		switch (trigger)
		{
		case eCommentaryTrigger.JumpshotAttemptTwo:
			return false;
		case eCommentaryTrigger.JumpshotAttemptThree:
			return false;
		case eCommentaryTrigger.JumpshotSuccess:
			return true;
		case eCommentaryTrigger.JumpshotMissed:
			return true;
		case eCommentaryTrigger.DunkAttempt:
			return false;
		case eCommentaryTrigger.DunkSuccess:
			return true;
		case eCommentaryTrigger.Idle:
			return false;
		case eCommentaryTrigger.GameStart:
			return true;
		case eCommentaryTrigger.GameEnd:
			return true;
		case eCommentaryTrigger.ChangePossession:
			return false;
		case eCommentaryTrigger.Violence:
			return false;
		case eCommentaryTrigger.BlockViolence:
			return true;
		default:
			return false;
		}
	}
}
