using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class SystemUI : Singleton<SystemUI>
{
	public enum State
	{
		SeaDads = 0,
		Title = 1,
		Cutscene = 2,
		Join = 3,
		HUD = 4,
		Results = 5
	}

	[SerializeField]
	private GameObject m_seadads;

	[SerializeField]
	private GameObject m_title;

	[SerializeField]
	private GameObject m_cutscene;

	[SerializeField]
	private GameObject m_hud;

	[SerializeField]
	private GameObject m_results;

	[SerializeField]
	private GameObject m_join;

	[SerializeField]
	private GameObject m_quitPrompt;

	[SerializeField]
	[Header("Hud")]
	private TeamWidget[] m_teamWidgets;

	[SerializeField]
	private GameObject m_timer;

	[SerializeField]
	private Text m_timerMinutes;

	[SerializeField]
	private Text m_timerSeconds;

	[SerializeField]
	private Text m_timerSecondsBig;

	[SerializeField]
	private Text m_controlsPrompt;

	[SerializeField]
	private GameObject m_players;

	[SerializeField]
	private PlayerWidget m_playerWidgetPrefab;

	[SerializeField]
	private Deactivator m_announcementPrompt;

	[SerializeField]
	private RectTransform m_basketballIndicator;

	[SerializeField]
	private RectTransform[] m_playerIndicators;

	[Header("Results")]
	[SerializeField]
	private Text m_resultTeamName;

	[SerializeField]
	private Text m_resultText;

	private State m_state;

	public void ShowAnnouncement(Color color, string announcementText, float duration, float intensity)
	{
		m_announcementPrompt.Show(duration);
		Array.ForEach(m_announcementPrompt.GetComponentsInChildren<Shake>(), delegate(Shake x)
		{
			x.StartShake(intensity, duration);
		});
		Array.ForEach(m_announcementPrompt.GetComponentsInChildren<Text>(), delegate(Text x)
		{
			x.text = announcementText;
			x.color = color.WithAlpha(x.color.a);
		});
	}

	public void ShowControlsPrompt(bool show)
	{
		if (show)
		{
			m_controlsPrompt.text = "Controls\n<color=#FFD041>Arrows / Left Stick</color> Move\n<color=#FFD041>C / Xbox A</color> Pass + Call for Ball\n<color=#FFD041>X / Xbox X</color> Shoot + Karate\n<color=#FFD041>SPACE / Xbox Y</color> Jump\n<color=#FFD041>Z / Xbox B</color> Dodge";
		}
		else
		{
			m_controlsPrompt.text = "Hold <color=#FFD041>F1</color> for Controls";
		}
	}

	public void ShowQuitPrompt(bool show)
	{
		m_quitPrompt.SetActive(show);
	}

	public void ShowCutscene(Sprite[] sprites)
	{
		GetCutscene().SetSprites(sprites);
		SetState(State.Cutscene);
	}

	public Cutscene GetCutscene()
	{
		return m_cutscene.GetComponent<Cutscene>();
	}

	public SeaDadsSplash GetSeaDads()
	{
		return m_seadads.GetComponent<SeaDadsSplash>();
	}

	public MenuJoin GetMenuJoin()
	{
		return m_join.GetComponent<MenuJoin>();
	}

	public void SetState(State state)
	{
		m_state = state;
		if (state == State.SeaDads)
		{
			m_seadads.SetActive(true);
			m_title.SetActive(false);
			m_cutscene.SetActive(false);
			m_join.SetActive(false);
			m_hud.SetActive(false);
			m_results.SetActive(false);
		}
		switch (state)
		{
		case State.Title:
			m_seadads.GetComponent<SeaDadsSplash>().StopSounds();
			m_seadads.SetActive(false);
			m_title.SetActive(true);
			m_cutscene.SetActive(false);
			m_join.SetActive(false);
			m_hud.SetActive(false);
			m_results.SetActive(false);
			break;
		case State.Cutscene:
			m_seadads.SetActive(false);
			m_title.SetActive(false);
			m_cutscene.SetActive(true);
			m_join.SetActive(false);
			m_hud.SetActive(false);
			m_results.SetActive(false);
			break;
		case State.Join:
			m_seadads.SetActive(false);
			m_title.SetActive(false);
			m_cutscene.SetActive(false);
			m_join.SetActive(true);
			m_hud.SetActive(false);
			m_results.SetActive(false);
			break;
		case State.HUD:
		{
			m_timer.GetComponent<FlashObject>().enabled = false;
			m_seadads.SetActive(false);
			m_title.SetActive(false);
			m_cutscene.SetActive(false);
			m_join.SetActive(false);
			m_hud.SetActive(true);
			m_results.SetActive(false);
			foreach (Transform item in m_players.transform)
			{
				UnityEngine.Object.Destroy(item.gameObject);
			}
			foreach (Team team in Singleton<SystemGame>.Get.GetTeams())
			{
				foreach (Player player in team.GetPlayers())
				{
					PlayerWidget playerWidget = UnityEngine.Object.Instantiate(m_playerWidgetPrefab, m_players.transform, false) as PlayerWidget;
					playerWidget.SetPlayer(player);
				}
			}
			List<Team> teams = Singleton<SystemGame>.Get.GetTeams();
			for (int i = 0; i < teams.Count; i++)
			{
				m_teamWidgets[i].SetTeam(teams[i]);
			}
			break;
		}
		case State.Results:
		{
			m_timer.GetComponent<FlashObject>().enabled = true;
			m_seadads.SetActive(false);
			m_title.SetActive(false);
			m_cutscene.SetActive(false);
			m_join.SetActive(false);
			m_hud.SetActive(true);
			m_results.SetActive(true);
			Team winningTeam = Singleton<SystemGame>.Get.GetWinningTeam();
			if ((bool)winningTeam)
			{
				m_resultTeamName.text = winningTeam.GetDisplayName();
				m_resultTeamName.color = winningTeam.GetColor();
			}
			else
			{
				m_resultTeamName.text = "TIE";
				m_resultTeamName.color = new Color32(byte.MaxValue, 208, 62, byte.MaxValue);
			}
			if ((bool)m_resultText)
			{
				m_resultText.text = Utils.GetRandomArrayValue(Singleton<SystemGame>.Get.GetResultText());
			}
			break;
		}
		}
	}

	private void Awake()
	{
		SetSingleton();
		m_quitPrompt.SetActive(false);
	}

	private void Update()
	{
		if (m_state == State.HUD)
		{
			UpdateHud();
		}
	}

	private void UpdateHud()
	{
		float num = Singleton<SystemGame>.Get.GetPlayTimer() + 0.9f;
		m_timerMinutes.text = Mathf.FloorToInt(num / 60f).ToString("D2");
		int num2 = Mathf.FloorToInt(num % 60f);
		m_timerSeconds.text = num2.ToString("D2");
		if (num2 > 0 && num <= 20f)
		{
			m_timerSecondsBig.gameObject.SetActive(true);
			m_timerSecondsBig.text = m_timerSeconds.text;
		}
		else
		{
			m_timerSecondsBig.gameObject.SetActive(false);
		}
		UpdateBaseketballIndicator();
		UpdatePlayerIndicators();
	}

	private void UpdateBaseketballIndicator()
	{
		List<Basketball> basketballs = Singleton<SystemGame>.Get.GetBasketballs();
		if (basketballs.Count > 0)
		{
			Basketball basketball = basketballs[0];
			Camera camera = Singleton<SystemGame>.Get.GetCamera();
			Vector3 vector = camera.WorldToViewportPoint(basketball.transform.position);
			if (vector.x < 0f || vector.x > 1f)
			{
				m_basketballIndicator.gameObject.SetActive(true);
				if (vector.x < 0f)
				{
					m_basketballIndicator.transform.eulerAngles = new Vector3(0f, 0f, 180f);
					vector = vector.WithX(0f);
				}
				else
				{
					m_basketballIndicator.transform.eulerAngles = new Vector3(0f, 0f, 0f);
					vector = vector.WithX(1f);
				}
				Image component = m_basketballIndicator.Find("ArrowOutline").GetComponent<Image>();
				if (basketball.GetState() == Basketball.eState.Held)
				{
					component.color = basketball.GetPlayerHolding().GetTeam().GetColor();
				}
				else if (basketball.GetState() == Basketball.eState.Shoot)
				{
					component.color = basketball.GetPlayerShooting().GetTeam().GetColor();
				}
				else if (basketball.GetState() == Basketball.eState.Pass)
				{
					component.color = basketball.GetPlayerReceiving().GetTeam().GetColor();
				}
				else
				{
					component.color = Color.gray;
				}
				m_basketballIndicator.anchoredPosition = ViewportToCanvasPosition(vector);
			}
			else
			{
				m_basketballIndicator.gameObject.SetActive(false);
			}
		}
		else
		{
			m_basketballIndicator.gameObject.SetActive(false);
		}
	}

	private void UpdatePlayerIndicators()
	{
		for (int i = 0; i < Singleton<SystemGame>.Get.GetPlayers().Count; i++)
		{
			Player player = Singleton<SystemGame>.Get.GetPlayers()[i];
			RectTransform rectTransform = m_playerIndicators[i];
			Text componentInChildren = rectTransform.GetComponentInChildren<Text>();
			Camera camera = Singleton<SystemGame>.Get.GetCamera();
			Vector3 vector = camera.WorldToViewportPoint(player.transform.position);
			if (vector.x < 0f || vector.x > 1f)
			{
				rectTransform.gameObject.SetActive(true);
				if (vector.x < 0f)
				{
					rectTransform.transform.eulerAngles = new Vector3(0f, 0f, 180f);
					vector = vector.WithX(0f);
				}
				else
				{
					rectTransform.transform.eulerAngles = new Vector3(0f, 0f, 0f);
					vector = vector.WithX(1f);
				}
				componentInChildren.transform.eulerAngles = Vector3.zero;
				rectTransform.anchoredPosition = ViewportToCanvasPosition(vector);
				if (player.GetIsAI())
				{
					componentInChildren.text = "CPU";
					componentInChildren.fontSize = 18;
					continue;
				}
				componentInChildren.text = 'P' + (Singleton<SystemGame>.Get.GetPlayerControllers().FindIndex((PlayerController item) => item == player.GetPlayerController()) + 1).ToString();
				componentInChildren.fontSize = 24;
			}
			else
			{
				rectTransform.gameObject.SetActive(false);
			}
		}
		List<Basketball> basketballs = Singleton<SystemGame>.Get.GetBasketballs();
		if (basketballs.Count > 0)
		{
			Basketball basketball = basketballs[0];
			Camera camera2 = Singleton<SystemGame>.Get.GetCamera();
			Vector3 vector2 = camera2.WorldToViewportPoint(basketball.transform.position);
			if (vector2.x < 0f || vector2.x > 1f)
			{
				m_basketballIndicator.gameObject.SetActive(true);
				if (vector2.x < 0f)
				{
					m_basketballIndicator.transform.eulerAngles = new Vector3(0f, 0f, 180f);
					vector2 = vector2.WithX(0f);
				}
				else
				{
					m_basketballIndicator.transform.eulerAngles = new Vector3(0f, 0f, 0f);
					vector2 = vector2.WithX(1f);
				}
				Image component = m_basketballIndicator.Find("ArrowOutline").GetComponent<Image>();
				if (basketball.GetState() == Basketball.eState.Held)
				{
					component.color = basketball.GetPlayerHolding().GetTeam().GetColor();
				}
				else if (basketball.GetState() == Basketball.eState.Shoot)
				{
					component.color = basketball.GetPlayerShooting().GetTeam().GetColor();
				}
				else if (basketball.GetState() == Basketball.eState.Pass)
				{
					component.color = basketball.GetPlayerReceiving().GetTeam().GetColor();
				}
				else
				{
					component.color = Color.gray;
				}
				m_basketballIndicator.anchoredPosition = ViewportToCanvasPosition(vector2);
			}
			else
			{
				m_basketballIndicator.gameObject.SetActive(false);
			}
		}
		else
		{
			m_basketballIndicator.gameObject.SetActive(false);
		}
	}

	public Vector3 ViewportToCanvasPosition(Vector3 viewportPosition)
	{
		RectTransform rectTransform = base.transform as RectTransform;
		Vector3 result = viewportPosition;
		result.x = result.x * rectTransform.rect.width - rectTransform.rect.width * 0.5f;
		result.y = result.y * rectTransform.rect.height - rectTransform.rect.height * 0.5f;
		return result;
	}
}
