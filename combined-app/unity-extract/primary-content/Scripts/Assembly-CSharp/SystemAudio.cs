using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

[ExecuteInEditMode]
public class SystemAudio : SingletonAuto<SystemAudio>
{
	[Serializable]
	private class AudioTypeVolume
	{
		public AudioCue.eAudioType m_type = AudioCue.eAudioType.Sound;

		public float m_volume = 1f;
	}

	private class ClipInfo
	{
		public AudioSource source { get; set; }

		public int type { get; set; }

		public float defaultVolume { get; set; }

		public float defaultPitch { get; set; }

		public Transform emmitter { get; set; }

		public Vector2 position { get; set; }

		public bool paused { get; set; }
	}

	private static readonly string STRING_NAME_PREFIX = "Audio: ";

	private static List<AudioSource> s_audioSourceDefaultList = new List<AudioSource>();

	[SerializeField]
	private List<AudioTypeVolume> m_volumeByType = new List<AudioTypeVolume>();

	[ReorderableArray]
	[SerializeField]
	[Tooltip("Audio cues that can be played by name")]
	private List<AudioCue> m_audioCues;

	[SerializeField]
	private float m_noDuplicateTime = 0.05f;

	private List<ClipInfo> m_activeAudio;

	private AudioSource m_activeMusic;

	private Transform m_audioListener;

	private bool m_hasFocus = true;

	private static readonly int AUDIO_SOURCE_POOL_SIZE = 16;

	private List<AudioSource> m_audioSources = new List<AudioSource>();

	public static void SetVolume(AudioCue.eAudioType type, float volume)
	{
		SystemAudio get = SingletonAuto<SystemAudio>.Get;
		float num = 1f;
		bool flag = false;
		if (volume <= 0f)
		{
			volume = -1f;
		}
		for (int i = 0; i < get.m_volumeByType.Count; i++)
		{
			if (get.m_volumeByType[i].m_type == type)
			{
				num = get.m_volumeByType[i].m_volume;
				get.m_volumeByType[i].m_volume = volume;
				flag = true;
				break;
			}
		}
		if (!flag)
		{
			get.m_volumeByType.Add(new AudioTypeVolume
			{
				m_type = type,
				m_volume = volume
			});
		}
		float num2 = volume / num;
		for (int j = 0; j < get.m_activeAudio.Count; j++)
		{
			ClipInfo clipInfo = get.m_activeAudio[j];
			if (clipInfo != null && ((uint)clipInfo.type & (uint)type) != 0)
			{
				if (clipInfo.source != null)
				{
					clipInfo.source.volume *= num2;
				}
				clipInfo.defaultVolume *= num2;
			}
		}
	}

	public static float GetVolume(AudioCue.eAudioType type)
	{
		SystemAudio get = SingletonAuto<SystemAudio>.Get;
		for (int i = 0; i < get.m_volumeByType.Count; i++)
		{
			if (get.m_volumeByType[i].m_type == type)
			{
				return Mathf.Clamp01(get.m_volumeByType[i].m_volume);
			}
		}
		return 1f;
	}

	public static AudioSource Play(string cueName, Transform emmitter = null)
	{
		AudioCue audioCue = SingletonAuto<SystemAudio>.m_instance.m_audioCues.Find((AudioCue item) => item.name == cueName);
		if (audioCue == null && Debug.isDebugBuild)
		{
			Debug.LogWarning("Sound cue not found: " + cueName);
		}
		return Play(audioCue, emmitter);
	}

	public static AudioSource Play(AudioCue cue)
	{
		return Play(cue, null, 0f, ref s_audioSourceDefaultList, 1f, 1f);
	}

	public static AudioSource Play(AudioCue cue, ref List<AudioSource> sources)
	{
		return Play(cue, null, 0f, ref sources, 1f, 1f);
	}

	public static AudioSource Play(AudioCue cue, Transform emmitter)
	{
		return Play(cue, emmitter, 0f, ref s_audioSourceDefaultList, 1f, 1f);
	}

	public static AudioSource Play(AudioCue cue, Transform emmitter, ref List<AudioSource> sources)
	{
		return Play(cue, emmitter, 0f, ref sources, 1f, 1f);
	}

	public static AudioSource PlayWithVolumePitch(AudioCue cue, float volume, float pitch)
	{
		return Play(cue, null, 0f, ref s_audioSourceDefaultList, volume, pitch);
	}

	public static AudioSource PlayFromTime(AudioCue cue, float fromTime)
	{
		return Play(cue, null, fromTime, ref s_audioSourceDefaultList, 1f, 1f);
	}

	public static AudioSource Play(AudioCue cue, Transform emmitter, float fromTime, ref List<AudioSource> sources, float volumeMult = 1f, float pitchMult = 1f)
	{
		if (cue == null)
		{
			return null;
		}
		SystemAudio get = SingletonAuto<SystemAudio>.Get;
		AudioCue.Clip clip = cue.GetClip();
		if (clip == null)
		{
			return null;
		}
		if (UnityEngine.Random.value > cue.m_chance)
		{
			return null;
		}
		AudioClip sound = clip.m_sound;
		if (sound == null)
		{
			return null;
		}
		for (int i = 0; i < get.m_activeAudio.Count; i++)
		{
			ClipInfo clipInfo = get.m_activeAudio[i];
			if (clipInfo.source != null && clipInfo.source.clip == sound && clipInfo.source.time < ((!(cue.m_noDuplicateTime >= 0f)) ? get.m_noDuplicateTime : cue.m_noDuplicateTime))
			{
				return null;
			}
		}
		float num = cue.m_volume.GetRandom() * clip.m_volume.GetRandom() * volumeMult;
		for (int j = 0; j < get.m_volumeByType.Count; j++)
		{
			if (((uint)get.m_volumeByType[j].m_type & (uint)cue.m_type) != 0)
			{
				num *= get.m_volumeByType[j].m_volume;
			}
		}
		float num2 = cue.m_pitch.GetRandom() * clip.m_pitch.GetRandom() * pitchMult;
		AudioSource source = get.SpawnAudioSource((!Debug.isDebugBuild) ? STRING_NAME_PREFIX : (STRING_NAME_PREFIX + sound.name), get.transform.position);
		AudioReverbFilter component = source.gameObject.GetComponent<AudioReverbFilter>();
		if (component == null)
		{
			get.AddSourceFilters(source.gameObject);
			component = source.gameObject.GetComponent<AudioReverbFilter>();
		}
		component.enabled = cue.m_reverbPreset != AudioReverbPreset.Off;
		if (component.enabled)
		{
			component.reverbPreset = cue.m_reverbPreset;
		}
		AudioEchoFilter component2 = source.gameObject.GetComponent<AudioEchoFilter>();
		component2.enabled = cue.m_echoFilter != null;
		if (component2.enabled)
		{
			component2.delay = cue.m_echoFilter.delay;
			component2.decayRatio = cue.m_echoFilter.decayRatio;
			component2.dryMix = cue.m_echoFilter.dryMix;
		}
		AudioDistortionFilter component3 = source.gameObject.GetComponent<AudioDistortionFilter>();
		component3.enabled = cue.m_distortionLevel > 0f;
		if (component3.enabled)
		{
			component3.distortionLevel = cue.m_distortionLevel;
		}
		AudioHighPassFilter component4 = source.gameObject.GetComponent<AudioHighPassFilter>();
		component4.enabled = cue.m_highPassFilter != null;
		if (component4.enabled)
		{
			component4.cutoffFrequency = cue.m_highPassFilter.cutoffFrequency;
			component4.highpassResonanceQ = cue.m_highPassFilter.highpassResonanceQ;
		}
		AudioLowPassFilter component5 = source.gameObject.GetComponent<AudioLowPassFilter>();
		component5.enabled = cue.m_lowPassFilter != null;
		if (component5.enabled)
		{
			component5.cutoffFrequency = cue.m_lowPassFilter.cutoffFrequency;
			component5.lowpassResonanceQ = cue.m_lowPassFilter.lowpassResonanceQ;
		}
		AudioChorusFilter component6 = source.gameObject.GetComponent<AudioChorusFilter>();
		component6.enabled = cue.m_chorusFilter != null;
		if (component6.enabled)
		{
			component6.delay = cue.m_chorusFilter.delay;
			component6.depth = cue.m_chorusFilter.depth;
			component6.dryMix = cue.m_chorusFilter.dryMix;
			component6.wetMix1 = cue.m_chorusFilter.wetMix1;
			component6.wetMix2 = cue.m_chorusFilter.wetMix2;
			component6.wetMix3 = cue.m_chorusFilter.wetMix3;
			component6.rate = cue.m_chorusFilter.rate;
		}
		source.transform.parent = get.transform;
		source.transform.localPosition = Vector3.zero;
		get.SetSource(ref source, sound, num, num2, cue.m_priority);
		source.loop = clip.m_loop;
		if (fromTime <= 0f && clip.m_startTime > 0f)
		{
			fromTime = clip.m_startTime;
		}
		if (fromTime > 0f && fromTime < source.clip.length * 0.95f)
		{
			source.time = fromTime;
		}
		else
		{
			source.time = 0f;
		}
		float random = cue.m_startDelay.GetRandom();
		if (random > 0f)
		{
			source.PlayDelayed(random);
		}
		else
		{
			source.Play();
			if (!source.isPlaying && source.time > 0f)
			{
				if (Debug.isDebugBuild)
				{
					Debug.LogWarning("Failed to play sound from specific time. Retrying from beginning");
				}
				source.time = 0f;
				source.Play();
			}
		}
		if (sources != s_audioSourceDefaultList)
		{
			sources.Add(source);
		}
		if (clip.m_endTime > 0f)
		{
			get.StartCoroutine(get.CoroutineStopAfterTime(source, clip.m_endTime - clip.m_startTime));
		}
		if (emmitter == null)
		{
			emmitter = get.transform;
		}
		get.m_activeAudio.Add(new ClipInfo
		{
			source = source,
			type = cue.m_type,
			defaultVolume = num,
			defaultPitch = num2,
			emmitter = ((!(emmitter == null)) ? emmitter : get.transform),
			position = emmitter.transform.position
		});
		if (cue.m_alsoPlay != null)
		{
			Play(cue.m_alsoPlay, emmitter, ref sources);
		}
		return source;
	}

	public static AudioSource Play(AudioClip clip, float volume = 1f, float pitch = 1f, bool loop = false, int type = 1, Transform emmitter = null)
	{
		if (clip == null)
		{
			return null;
		}
		SystemAudio get = SingletonAuto<SystemAudio>.Get;
		for (int i = 0; i < get.m_activeAudio.Count; i++)
		{
			ClipInfo clipInfo = get.m_activeAudio[i];
			if (clipInfo.source != null && clipInfo.source.clip == clip && clipInfo.source.time < get.m_noDuplicateTime)
			{
				return null;
			}
		}
		for (int j = 0; j < get.m_volumeByType.Count; j++)
		{
			if (((uint)get.m_volumeByType[j].m_type & (uint)type) != 0)
			{
				volume *= get.m_volumeByType[j].m_volume;
			}
		}
		AudioSource source = get.SpawnAudioSource((!Debug.isDebugBuild) ? STRING_NAME_PREFIX : (STRING_NAME_PREFIX + clip.name), get.transform.position);
		source.transform.parent = get.transform;
		source.transform.localPosition = Vector3.zero;
		get.SetSource(ref source, clip, volume, pitch, 0);
		source.loop = loop;
		source.Play();
		if (emmitter == null)
		{
			emmitter = get.transform;
		}
		get.m_activeAudio.Add(new ClipInfo
		{
			source = source,
			type = type,
			defaultVolume = volume,
			defaultPitch = pitch,
			emmitter = ((!(emmitter == null)) ? emmitter : get.transform),
			position = emmitter.transform.position
		});
		return source;
	}

	public static void Pause(AudioSource source)
	{
		if (!(source == null))
		{
			ClipInfo clipInfo = SingletonAuto<SystemAudio>.m_instance.m_activeAudio.Find((ClipInfo clip) => clip.source == source);
			if (clipInfo != null && !clipInfo.paused)
			{
				clipInfo.paused = true;
				source.Pause();
			}
		}
	}

	public static void UnPause(AudioSource source)
	{
		if (!(source == null))
		{
			ClipInfo clipInfo = SingletonAuto<SystemAudio>.m_instance.m_activeAudio.Find((ClipInfo clip) => clip.source == source);
			if (clipInfo != null && clipInfo.paused)
			{
				clipInfo.paused = false;
				source.Play();
			}
		}
	}

	public static void Stop(AudioSource source, float overTime = 0f)
	{
		Stop(ref source, overTime);
	}

	public static void Stop(ref AudioSource source, float overTime = 0f)
	{
		if ((bool)SingletonAuto<SystemAudio>.m_instance && source != null && source.isPlaying)
		{
			if (overTime <= 0f)
			{
				source.Stop();
				source.gameObject.SetActive(false);
			}
			else
			{
				SingletonAuto<SystemAudio>.m_instance.StartCoroutine(SingletonAuto<SystemAudio>.m_instance.CoroutineStopFade(source, overTime));
			}
		}
		source = null;
	}

	private IEnumerator CoroutineStopAfterTime(AudioSource source, float time)
	{
		yield return new WaitForSeconds(time);
		Stop(source, 0.067f);
	}

	private IEnumerator CoroutineStopFade(AudioSource source, float time)
	{
		ClipInfo clipInfo = m_activeAudio.Find((ClipInfo clip) =>
		{
			AudioSource source2 = default(AudioSource);
			return clip.source == source2;
		});
		if (clipInfo != null && time > 0f)
		{
			float volumeDelta = 1f / time * clipInfo.defaultVolume;
			while (time > 0f)
			{
				if (source == null || !source.isPlaying || clipInfo == null)
				{
					yield break;
				}
				time -= Time.deltaTime;
				clipInfo.defaultVolume -= Time.deltaTime * volumeDelta;
				yield return new WaitForEndOfFrame();
			}
		}
		Stop(source, 0f);
	}

	private IEnumerator CoroutineFadeIn(AudioSource source, float time)
	{
		ClipInfo clipInfo = m_activeAudio.Find((ClipInfo clip) =>
		{
			AudioSource source2 = default(AudioSource);
			return clip.source == source2;
		});
		if (clipInfo == null)
		{
			yield break;
		}
		float targetVolume = clipInfo.defaultVolume;
		float volumeDelta = 1f / time * clipInfo.defaultVolume;
		clipInfo.defaultVolume = 0f;
		while (time > 0f)
		{
			if (!m_hasFocus)
			{
				yield return new WaitForEndOfFrame();
			}
			if (source == null || (!source.isPlaying && !clipInfo.paused) || clipInfo == null)
			{
				break;
			}
			time -= Time.deltaTime;
			clipInfo.defaultVolume += Time.deltaTime * volumeDelta;
			if (time <= 0f)
			{
				clipInfo.defaultVolume = targetVolume;
			}
			yield return new WaitForEndOfFrame();
		}
	}

	public static AudioSource PlayMusic(string name, float fadeTime = 0f)
	{
		return PlayMusic(name, fadeTime, fadeTime);
	}

	public static AudioSource PlayMusic(string name, float fadeOutTime, float fadeInTime)
	{
		return PlayMusic(SingletonAuto<SystemAudio>.m_instance.m_audioCues.Find((AudioCue item) => item.name == name), fadeOutTime, fadeInTime);
	}

	public static AudioSource PlayMusic(AudioCue cue, float fadeTime = 0f)
	{
		return PlayMusic(cue, fadeTime, fadeTime);
	}

	public static AudioSource PlayMusic(AudioCue cue, float fadeOutTime, float fadeInTime)
	{
		StopMusic(fadeOutTime);
		SingletonAuto<SystemAudio>.m_instance.m_activeMusic = Play(cue);
		if (fadeInTime > 0f)
		{
			SingletonAuto<SystemAudio>.m_instance.StartCoroutine(SingletonAuto<SystemAudio>.m_instance.CoroutineFadeIn(SingletonAuto<SystemAudio>.m_instance.m_activeMusic, fadeInTime));
		}
		return SingletonAuto<SystemAudio>.m_instance.m_activeMusic;
	}

	public static void StopMusic(float fadeTime = 0f)
	{
		Stop(SingletonAuto<SystemAudio>.Get.m_activeMusic, fadeTime);
		SingletonAuto<SystemAudio>.Get.m_activeMusic = null;
	}

	public void pauseFX()
	{
		foreach (ClipInfo item in m_activeAudio)
		{
			try
			{
				if (item.source != m_activeMusic)
				{
					Pause(item.source);
				}
			}
			catch
			{
			}
		}
	}

	public void unpauseFX()
	{
		foreach (ClipInfo item in m_activeAudio)
		{
			try
			{
				if (!item.source.isPlaying)
				{
					UnPause(item.source);
				}
			}
			catch
			{
			}
		}
	}

	public void PostSync(bool saved)
	{
	}

	private void Initialise()
	{
		AudioListener audioListener = Array.Find(UnityEngine.Object.FindObjectsOfType<AudioListener>(), (AudioListener item) => item.enabled);
		if (audioListener != null)
		{
			m_audioListener = audioListener.transform;
		}
		if (m_audioListener == null)
		{
			if (Debug.isDebugBuild)
			{
				Debug.Log("Unable to find audio listener in scene");
			}
			return;
		}
		foreach (ClipInfo item in m_activeAudio)
		{
			if ((item.type & 6) == 0)
			{
				Stop(item.source, 0.1f);
			}
		}
	}

	private void OnSceneLoaded(Scene scene, LoadSceneMode loadSceneMode)
	{
		Initialise();
	}

	private void Awake()
	{
		SceneManager.sceneLoaded += OnSceneLoaded;
		SetSingleton();
		if (Application.isPlaying)
		{
			UnityEngine.Object.DontDestroyOnLoad(this);
		}
		for (int i = 0; i < AUDIO_SOURCE_POOL_SIZE; i++)
		{
			GameObject gameObject = new GameObject(STRING_NAME_PREFIX);
			m_audioSources.Add(gameObject.AddComponent<AudioSource>());
			gameObject.SetActive(false);
			gameObject.transform.parent = base.transform;
		}
		m_activeAudio = new List<ClipInfo>();
		try
		{
			m_audioListener = ((AudioListener)UnityEngine.Object.FindObjectOfType(typeof(AudioListener))).transform;
		}
		catch
		{
			if (Debug.isDebugBuild)
			{
				Debug.Log("Unable to find audio listener in scene");
			}
		}
		m_activeAudio = new List<ClipInfo>();
		m_activeMusic = null;
	}

	private void OnDestroy()
	{
	}

	private void Start()
	{
	}

	private void OnApplicationFocus(bool hasFocus)
	{
		m_hasFocus = hasFocus;
	}

	private void Update()
	{
		if (m_audioListener == null)
		{
			try
			{
				m_audioListener = ((AudioListener)UnityEngine.Object.FindObjectOfType(typeof(AudioListener))).transform;
			}
			catch
			{
			}
		}
		base.transform.position = m_audioListener.position;
		UpdateActiveAudio();
	}

	private float GetFalloff(Vector2 soundPos)
	{
		return 1f;
	}

	private void SetSource(ref AudioSource source, AudioClip clip, float volume, float pitch, int priority)
	{
		source.rolloffMode = AudioRolloffMode.Linear;
		source.dopplerLevel = 0.2f;
		source.minDistance = 0f;
		source.maxDistance = 50f;
		source.priority = priority;
		source.pitch = pitch;
		source.clip = clip;
		float num = 1f;
		if ((bool)source.transform)
		{
			num *= GetFalloff(source.transform.position);
		}
		source.volume = volume * num;
		source.spatialBlend = 0f;
	}

	private void UpdateActiveAudio()
	{
		if (!m_hasFocus)
		{
			return;
		}
		List<ClipInfo> list = new List<ClipInfo>();
		try
		{
			foreach (ClipInfo item in m_activeAudio)
			{
				if (item.source == null || (!item.source.isPlaying && !item.paused))
				{
					list.Add(item);
					continue;
				}
				float num = 1f;
				if (item.emmitter != null)
				{
					item.position = item.emmitter.position;
				}
				num *= GetFalloff(item.position);
				item.source.volume = item.defaultVolume * num;
			}
		}
		catch
		{
			if (Debug.isDebugBuild)
			{
				Debug.Log("Error updating active audio clips");
			}
			return;
		}
		foreach (ClipInfo item2 in list)
		{
			m_activeAudio.Remove(item2);
			if (item2.source != null)
			{
				item2.source.Stop();
				if (item2.source.gameObject != null)
				{
					item2.source.gameObject.SetActive(false);
				}
			}
		}
		if (Application.isEditor && !Application.isPlaying && m_activeAudio.Count <= 0)
		{
			UnityEngine.Object.DestroyImmediate(base.gameObject);
		}
	}

	private AudioSource SpawnAudioSource(string name, Vector2 position)
	{
		AudioSource audioSource = null;
		for (int i = 0; i < m_audioSources.Count; i++)
		{
			audioSource = m_audioSources[i];
			if (audioSource == null)
			{
				GameObject gameObject = new GameObject();
				audioSource = gameObject.AddComponent<AudioSource>();
				m_audioSources[i] = audioSource;
				gameObject.SetActive(false);
				gameObject.transform.parent = base.transform;
				break;
			}
			if (!audioSource.gameObject.activeSelf)
			{
				break;
			}
			audioSource = null;
		}
		if (audioSource == null)
		{
			GameObject gameObject2 = new GameObject(STRING_NAME_PREFIX);
			audioSource = gameObject2.AddComponent<AudioSource>();
			m_audioSources.Add(audioSource);
			gameObject2.SetActive(false);
			gameObject2.transform.parent = base.transform;
		}
		if (audioSource != null)
		{
			audioSource.gameObject.SetActive(true);
			if (Debug.isDebugBuild)
			{
				audioSource.gameObject.name = name;
			}
			audioSource.gameObject.transform.position = position;
		}
		else if (Debug.isDebugBuild)
		{
			Debug.Log("Failed to spawn audio source");
		}
		return audioSource;
	}

	private void AddSourceFilters(GameObject source)
	{
		AudioLowPassFilter audioLowPassFilter = source.AddComponent<AudioLowPassFilter>();
		audioLowPassFilter.enabled = false;
		AudioHighPassFilter audioHighPassFilter = source.AddComponent<AudioHighPassFilter>();
		audioHighPassFilter.enabled = false;
		AudioEchoFilter audioEchoFilter = source.AddComponent<AudioEchoFilter>();
		audioEchoFilter.enabled = false;
		AudioChorusFilter audioChorusFilter = source.AddComponent<AudioChorusFilter>();
		audioChorusFilter.enabled = false;
		AudioDistortionFilter audioDistortionFilter = source.AddComponent<AudioDistortionFilter>();
		audioDistortionFilter.enabled = false;
		AudioReverbFilter audioReverbFilter = source.AddComponent<AudioReverbFilter>();
		audioReverbFilter.enabled = false;
	}
}
