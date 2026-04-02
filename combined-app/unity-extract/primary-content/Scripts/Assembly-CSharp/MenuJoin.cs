using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class MenuJoin : MonoBehaviour
{
	[SerializeField]
	private List<RectTransform> m_joinPlayers;

	[SerializeField]
	private List<Text> m_joinPlayersText;

	[SerializeField]
	private List<Image> m_joinPlayersImage;

	[SerializeField]
	private GameObject m_joinTextPressButtonToStart;

	[SerializeField]
	private float m_joinTextOffset = 175f;

	[SerializeField]
	private Sprite m_spriteKeyboard;

	[SerializeField]
	private Sprite m_spriteController;

	[SerializeField]
	private float m_readyWaitTime = 1f;

	[SerializeField]
	private Color m_colourTextJoin = Color.white;

	[SerializeField]
	private Color m_colourTextTeamNone = Color.white;

	[SerializeField]
	private Color m_colourTextTeam1 = Color.white;

	[SerializeField]
	private Color m_colourTextTeam2 = Color.white;

	[SerializeField]
	private Color m_colourTextTeam1Ready = Color.white;

	[SerializeField]
	private Color m_colourTextTeam2Ready = Color.white;

	[SerializeField]
	private Color m_colourImageJoin = Color.white;

	[SerializeField]
	private Color m_colourImageTeamNone = Color.white;

	[SerializeField]
	private Color m_colourImageTeam1 = Color.white;

	[SerializeField]
	private Color m_colourImageTeam2 = Color.white;

	[SerializeField]
	private Color m_colourImageTeam1Ready = Color.white;

	[SerializeField]
	private Color m_colourImageTeam2Ready = Color.white;

	[SerializeField]
	private Text m_textAI;

	private HashSet<PlayerController> m_readyControllers = new HashSet<PlayerController>();

	private float m_readyWaitTimer;

	public bool GetReady()
	{
		return m_readyWaitTimer > m_readyWaitTime;
	}

	private void OnEnable()
	{
		m_readyWaitTimer = 0f;
		m_readyControllers.Clear();
	}

	private void Update()
	{
		bool flag = Singleton<SystemGame>.Get.GetPlayerControllers().Count > 0;
		for (int i = 0; i < m_joinPlayers.Count; i++)
		{
			RectTransform rectTransform = m_joinPlayers[i];
			Text text = m_joinPlayersText[i];
			Image image = m_joinPlayersImage[i];
			GameObject gameObject = rectTransform.transform.FindChild("L").gameObject;
			GameObject gameObject2 = rectTransform.transform.FindChild("R").gameObject;
			PlayerController playerController = null;
			if (Singleton<SystemGame>.Get.GetPlayerControllers().IsIndexValid(i))
			{
				playerController = Singleton<SystemGame>.Get.GetPlayerControllers()[i];
			}
			if (playerController == null)
			{
				rectTransform.localPosition = rectTransform.localPosition.WithX(0f);
				text.text = "PRESS ANY BUTTON";
				text.color = m_colourTextJoin;
				image.gameObject.SetActive(true);
				image.color = m_colourImageJoin;
				image.sprite = m_spriteController;
				gameObject.SetActive(false);
				gameObject2.SetActive(false);
				continue;
			}
			text.text = "P" + (i + 1);
			image.gameObject.SetActive(true);
			image.sprite = ((playerController.GetDeviceId() != PlayerController.eDeviceId.KeyboardA) ? m_spriteController : m_spriteKeyboard);
			if (playerController.GetTeam() == -1)
			{
				rectTransform.localPosition = rectTransform.localPosition.WithX(0f);
				text.color = m_colourTextTeamNone;
				image.color = m_colourImageTeamNone;
				flag = false;
				gameObject.SetActive(true);
				gameObject2.SetActive(true);
			}
			else
			{
				rectTransform.localPosition = rectTransform.localPosition.WithX((playerController.GetTeam() != 0) ? m_joinTextOffset : (0f - m_joinTextOffset));
				if (!playerController.GetReady())
				{
					text.color = ((playerController.GetTeam() != 0) ? m_colourTextTeam2 : m_colourTextTeam1);
					image.color = ((playerController.GetTeam() != 0) ? m_colourImageTeam2 : m_colourImageTeam1);
					gameObject.SetActive(playerController.GetTeam() != 0);
					gameObject2.SetActive(playerController.GetTeam() == 0);
					flag = false;
				}
				if (m_readyControllers.Contains(playerController) != playerController.GetReady())
				{
					if (playerController.GetReady())
					{
						m_readyControllers.Add(playerController);
						gameObject.SetActive(false);
						gameObject2.SetActive(false);
						StartCoroutine(CoroutineFlashController(text, image, playerController));
					}
					else
					{
						m_readyControllers.Remove(playerController);
					}
				}
			}
			if (playerController.ToggleAI.WasPressed)
			{
				Singleton<SystemGame>.Get.ToggleDifficulty();
			}
		}
		if (Singleton<SystemGame>.Get.GetPlayerControllers().Count == 4)
		{
			m_textAI.enabled = false;
		}
		else
		{
			m_textAI.text = "AI: " + ((Singleton<SystemGame>.Get.GetDifficulty() != SystemGame.eDifficulty.Easy) ? "HARD" : "EASY");
			m_textAI.enabled = true;
		}
		if (flag)
		{
			m_joinTextPressButtonToStart.SetActive(true);
			m_joinTextPressButtonToStart.GetComponent<Text>().text = "Ready!";
		}
		else if (Singleton<SystemGame>.Get.GetPlayerControllers().Count > 0)
		{
			m_joinTextPressButtonToStart.SetActive(true);
			m_joinTextPressButtonToStart.GetComponent<Text>().text = "Select Your Team";
		}
		else
		{
			m_joinTextPressButtonToStart.SetActive(true);
		}
		if (flag)
		{
			m_readyWaitTimer += Time.deltaTime;
		}
		else
		{
			m_readyWaitTimer = 0f;
		}
	}

	private IEnumerator CoroutineFlashController(Text text, Image image, PlayerController controller)
	{
		text.color = ((controller.GetTeam() != 0) ? m_colourTextTeam2Ready : m_colourTextTeam1Ready);
		Vector3 oldScale = image.rectTransform.localScale;
		image.rectTransform.localScale = oldScale * 1.2f;
		image.color = Color.white;
		yield return new WaitForSeconds(0.1f);
		image.color = ((controller.GetTeam() != 0) ? m_colourImageTeam2Ready : m_colourImageTeam1Ready);
		yield return new WaitForSeconds(0.1f);
		image.color = Color.white;
		yield return new WaitForSeconds(0.1f);
		image.color = ((controller.GetTeam() != 0) ? m_colourImageTeam2Ready : m_colourImageTeam1Ready);
		image.rectTransform.localScale = oldScale;
	}
}
