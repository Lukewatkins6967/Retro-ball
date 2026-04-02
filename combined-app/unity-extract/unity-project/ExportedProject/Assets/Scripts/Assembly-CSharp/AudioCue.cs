using System;
using System.Collections.Generic;
using UnityEngine;

public class AudioCue : MonoBehaviour
{
	public enum eShake
	{
		Small = 0,
		Medium = 1,
		Large = 2
	}

	public enum eAudioType
	{
		Sound = 1,
		Music = 2,
		Dialog = 4,
		Menu = 8,
		Contact = 0x10,
		Swipe = 0x20,
		Placeholder1 = 0x40,
		Placeholder2 = 0x80,
		Placeholder3 = 0x100,
		Placeholder4 = 0x200,
		Placeholder5 = 0x400
	}

	[Serializable]
	public class Clip
	{
		[HideInInspector]
		public AudioClip m_sound;

		[HideInInspector]
		public float m_weight = 100f;

		public bool m_loop;

		public MinMaxRange m_volume = new MinMaxRange(1f);

		public MinMaxRange m_pitch = new MinMaxRange(1f);

		public float m_startTime;

		public float m_endTime;
	}

	[BitMask(typeof(eAudioType))]
	public int m_type = 1;

	public MinMaxRange m_volume = new MinMaxRange(1f);

	public MinMaxRange m_pitch = new MinMaxRange(1f);

	public int m_priority = 128;

	public float m_chance = 1f;

	public AudioCue m_alsoPlay;

	public AudioReverbPreset m_reverbPreset;

	[Range(0f, 0.9f)]
	public float m_distortionLevel;

	public AudioEchoFilter m_echoFilter;

	public AudioLowPassFilter m_lowPassFilter;

	public AudioHighPassFilter m_highPassFilter;

	public AudioChorusFilter m_chorusFilter;

	public MinMaxRange m_startDelay = new MinMaxRange(0f);

	public List<Clip> m_sounds = new List<Clip>(1);

	public float m_totalWeight;

	private float m_maxWeightInv;

	[Tooltip("If >=0 overrides the default time between the same sound playing")]
	public float m_noDuplicateTime = -1f;

	private ShuffledIndex m_shuffledIndex;

	public void Play()
	{
		SystemAudio.Play(this);
	}

	public void Play(Transform emmitter)
	{
		SystemAudio.Play(this, emmitter);
	}

	public Clip GetClip()
	{
		if (m_sounds.Count == 0)
		{
			return null;
		}
		if (m_maxWeightInv <= 0f)
		{
			UpdateWeights();
		}
		if (m_maxWeightInv <= 0f)
		{
			return null;
		}
		if (m_shuffledIndex == null || m_shuffledIndex.Count != m_sounds.Count)
		{
			m_shuffledIndex = new ShuffledIndex(m_sounds.Count);
		}
		Clip clip = null;
		while (clip == null)
		{
			clip = m_sounds[m_shuffledIndex.Next()];
			if (clip.m_weight > 0f && UnityEngine.Random.value <= clip.m_weight * m_maxWeightInv)
			{
				break;
			}
		}
		return clip;
	}

	public int GetClipIndex(AudioClip clip)
	{
		return m_sounds.FindIndex((Clip item) => item.m_sound == clip);
	}

	public AudioClip GetClip(int index)
	{
		return (!m_sounds.IsIndexValid(index)) ? null : m_sounds[index].m_sound;
	}

	public void UpdateWeights()
	{
		m_totalWeight = 0f;
		m_maxWeightInv = 0f;
		float num = 0f;
		foreach (Clip sound in m_sounds)
		{
			m_totalWeight += sound.m_weight;
			if (sound.m_weight > num)
			{
				num = sound.m_weight;
			}
		}
		if (num > 0f)
		{
			m_maxWeightInv = 1f / num;
		}
		if (m_totalWeight <= 0f)
		{
			m_totalWeight = 1f;
		}
	}
}
