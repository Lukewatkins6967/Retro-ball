using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class SeaDadsSplash : MonoBehaviour
{
	[SerializeField]
	private AudioCue m_soundCreakSmall;

	[SerializeField]
	private MinMaxRange m_soundCreakSmallTime = new MinMaxRange(0.6f, 2f);

	[SerializeField]
	private Text m_textCredits;

	private List<AudioSource> m_playing = new List<AudioSource>();

	private bool m_finished;

	private float m_soundCreakTimer;

	public void PlaySound(GameObject sound)
	{
		AudioSource item = SystemAudio.Play(sound.GetComponent<AudioCue>());
		m_playing.Add(item);
	}

	public void StopSounds()
	{
		if (m_playing == null || m_playing.Count <= 0)
		{
			return;
		}
		foreach (AudioSource item in m_playing)
		{
			if (item != null)
			{
				item.Stop();
			}
		}
	}

	public void Finished()
	{
		m_finished = true;
	}

	public bool IsFinished()
	{
		return m_finished;
	}

	private void Update()
	{
		AnimStateMachine component = GetComponent<AnimStateMachine>();
		switch (component.GetStateName())
		{
		case "Intro":
			if (Input.GetKeyDown(KeyCode.Escape))
			{
				component.SetState("Finished");
			}
			else if (component.GetStateTime() > 0.6f && Input.anyKeyDown && !Input.GetMouseButtonDown(0))
			{
				component.SetState("Title");
			}
			m_soundCreakTimer += Time.deltaTime;
			if (m_soundCreakTimer >= (float)m_soundCreakSmallTime)
			{
				m_soundCreakSmallTime.Randomise();
				m_soundCreakTimer = 0f;
				PlaySound(m_soundCreakSmall.gameObject);
			}
			break;
		case "Title":
			Cursor.visible = false;
			HoverOff();
			if (component.GetStateTime() > 0.2f && Input.anyKeyDown)
			{
				component.SetState("Finished");
			}
			break;
		case "Finished":
			HoverOff();
			m_finished = true;
			Cursor.visible = false;
			break;
		}
	}

	public void HoverOn(string text)
	{
		AnimStateMachine component = GetComponent<AnimStateMachine>();
		if (component.GetStateTime() > 0.6f && GetComponent<AnimStateMachine>().GetStateName() == "Intro")
		{
			m_textCredits.gameObject.SetActive(true);
			m_textCredits.text = text;
		}
	}

	public void HoverOff()
	{
		m_textCredits.gameObject.SetActive(false);
	}

	public void Click(string text)
	{
		Application.OpenURL(text);
	}
}
