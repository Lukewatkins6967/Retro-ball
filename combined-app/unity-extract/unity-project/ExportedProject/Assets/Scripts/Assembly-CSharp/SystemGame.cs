using System;
using System.Collections;
using System.Collections.Generic;
using InControl;
using UnityEngine;

public class SystemGame : Singleton<SystemGame>
{
	public enum eState
	{
		SeaDads = 0,
		Title = 1,
		IntroCutscene = 2,
		Join = 3,
		StartPause = 4,
		Playing = 5,
		GameOver = 6
	}

	public enum eDifficulty
	{
		Easy = 0,
		Hard = 1
	}

	[SerializeField]
	private Camera m_cameraPrefab;

	[SerializeField]
	private int m_playerCount = 4;

	[SerializeField]
	private Team[] m_teamPrefabs;

	[SerializeField]
	private Basketball m_basketballPrefab;

	[SerializeField]
	public float m_threePointDistance = 7.3f;

	[SerializeField]
	private float m_playDuration = 120f;

	[Header("Weapon")]
	[SerializeField]
	private Weapon[] m_weaponPrefabs;

	[SerializeField]
	private MinMaxRange m_weaponSpawnTime = new MinMaxRange(60f, 120f);

	[SerializeField]
	private float m_weaponMinPlayTimeRemaining = 20f;

	[SerializeField]
	[Header("Audio")]
	private AudioCue m_musicIntro;

	[SerializeField]
	private AudioCue m_music;

	[SerializeField]
	private AudioCue m_crowdAmbience;

	[SerializeField]
	private AudioCue m_throwUp;

	[SerializeField]
	private AudioCue m_soundChooseTeam;

	[SerializeField]
	private AudioCue m_soundReady;

	[SerializeField]
	[Header("Misc")]
	private string[] m_scoreText;

	[SerializeField]
	private string[] m_resultText;

	[SerializeField]
	private GameObject[] m_scoreEffects;

	[SerializeField]
	[Header("Intro Cutscene")]
	private Sprite[] m_introCutscene;

	[SerializeField]
	private float m_cutsceneBlocktime = 1.5f;

	private Court m_court;

	private Camera m_camera;

	private List<Player> m_players = new List<Player>();

	private List<Team> m_teams = new List<Team>();

	private List<Basketball> m_basketBalls = new List<Basketball>();

	private float m_startPauseTimer;

	private float m_playTimer;

	private float m_restartTimer;

	private float m_blockInput;

	private float m_controlsTimer;

	private float m_quitTimer;

	private float m_quitShowUITimer;

	private float m_weaponSpawnTimer;

	private eState m_state;

	private bool m_throwInActive;

	private bool m_gameStartCommentaryPlayed;

	private List<PlayerController> m_playerControllers = new List<PlayerController>();

	private List<GameObject> m_weapons = new List<GameObject>();

	private AudioSource m_crowdAmbienceSource;

	private eDifficulty m_difficulty;

	public eDifficulty GetDifficulty()
	{
		return m_difficulty;
	}

	public eDifficulty ToggleDifficulty()
	{
		m_difficulty = ((m_difficulty != eDifficulty.Hard) ? eDifficulty.Hard : eDifficulty.Easy);
		PlayerPrefs.SetInt("AI", (int)m_difficulty);
		return m_difficulty;
	}

	public AudioCue GetSoundThrowUp()
	{
		return m_throwUp;
	}

	public List<Player> GetPlayers()
	{
		return m_players;
	}

	public List<Team> GetTeams()
	{
		return m_teams;
	}

	public List<Basketball> GetBasketballs()
	{
		return m_basketBalls;
	}

	public List<GameObject> GetWeapons()
	{
		return m_weapons;
	}

	public float GetPlayTimer()
	{
		return m_playTimer;
	}

	public bool GetThrowInActive()
	{
		return m_throwInActive;
	}

	public bool GetIsPlaying()
	{
		return m_state == eState.Playing;
	}

	public Team GetWinningTeam()
	{
		if (m_teams[0].GetScore() > m_teams[1].GetScore())
		{
			return m_teams[0];
		}
		if (m_teams[1].GetScore() > m_teams[0].GetScore())
		{
			return m_teams[1];
		}
		return null;
	}

	public List<PlayerController> GetPlayerControllers()
	{
		return m_playerControllers;
	}

	public void OnBallScored(Basketball ball, Hoop hoop)
	{
		if (m_throwInActive)
		{
			return;
		}
		SystemAudio.Play(Singleton<Constants>.Get.m_soundBackboard);
		bool flag = false;
		if (ball.GetBallHeld())
		{
			if (!(ball.GetPlayerHolding() != null) || !(ball.GetPlayerHolding().GetVelocity().y < 0f))
			{
				return;
			}
			m_camera.GetComponent<Shake>().StartShake(0.5f, 1f);
			Singleton<SystemUI>.Get.ShowAnnouncement(ball.GetPlayerHolding().GetTeam().GetColorLight(), "DUNK!!!", 1f, 25f);
			flag = true;
		}
		if (m_state == eState.Playing)
		{
			Team team = null;
			foreach (Team team2 in m_teams)
			{
				if (team2.GetAttackHoop() == hoop)
				{
					int num = -1;
					num = ((!(ball.GetShootDistance() > m_threePointDistance)) ? 2 : 3);
					if (flag)
					{
						Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.DunkSuccess);
					}
					else
					{
						Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.JumpshotSuccess);
					}
					if (!ball.GetBallHeld())
					{
						Singleton<SystemUI>.Get.ShowAnnouncement(team2.GetColorLight(), num + " points!", 1f, 0f);
					}
					team2.SetScore(team2.GetScore() + num);
					Debug.Log(team2.GetDisplayName() + " scored " + num + "! Score: " + team2.GetScore());
				}
				else
				{
					team = team2;
				}
			}
			m_throwInActive = true;
			foreach (Player player in m_players)
			{
				player.OnGoal(null, flag);
			}
			ball.OnGoal(hoop);
			StartCoroutine(CoroutineOnScoreSequence(ball, hoop, team, flag));
		}
		GameObject[] array = GameObject.FindGameObjectsWithTag("Judge");
		GameObject[] array2 = array;
		foreach (GameObject gameObject in array2)
		{
			GameObject gameObject2 = UnityEngine.Object.Instantiate(Utils.GetRandomArrayValue(m_scoreEffects), gameObject.transform, false) as GameObject;
			gameObject2.transform.localPosition += Vector3.up * UnityEngine.Random.Range(1.1f, 1.4f);
		}
	}

	public string[] GetScoreText()
	{
		return m_scoreText;
	}

	public string[] GetResultText()
	{
		return m_resultText;
	}

	public Camera GetCamera()
	{
		return m_camera;
	}

	private void Update()
	{
		if (Input.GetKey(KeyCode.Escape) && m_state >= eState.Join)
		{
			m_quitShowUITimer = 0.75f;
			m_quitTimer += Time.deltaTime;
			if (m_quitTimer >= 1f)
			{
				if (m_state == eState.Join)
				{
					Application.Quit();
				}
				else
				{
					m_quitTimer = 0f;
					SetState(eState.Join);
				}
			}
		}
		m_quitShowUITimer -= Time.deltaTime;
		if (m_quitShowUITimer > 0f)
		{
			Singleton<SystemUI>.Get.ShowQuitPrompt(true);
		}
		else
		{
			Singleton<SystemUI>.Get.ShowQuitPrompt(false);
			m_quitTimer = 0f;
		}
		if (m_blockInput > 0f)
		{
			m_blockInput -= Time.deltaTime;
		}
		if (m_state == eState.SeaDads)
		{
			CheckPlayerControllerAssignment();
			if (Singleton<SystemUI>.Get.GetSeaDads().IsFinished())
			{
				SetState(eState.Title);
			}
		}
		else if (m_state == eState.Title)
		{
			CheckPlayerControllerAssignment();
			if ((m_blockInput <= 0f && (Input.anyKeyDown || GetAnyControllerPressedStart())) || Input.GetKey(KeyCode.Escape))
			{
				SetState(eState.IntroCutscene);
			}
		}
		else if (m_state == eState.IntroCutscene)
		{
			CheckPlayerControllerAssignment();
			if (GetAnyControllerPressedBack() || Input.GetKey(KeyCode.Escape))
			{
				SetState(eState.Join);
				SystemAudio.Play(Constants.Data.m_soundBounce);
			}
			else
			{
				if (!(m_blockInput <= 0f))
				{
					return;
				}
				Singleton<SystemUI>.Get.GetCutscene().ShowContinuePrompt();
				if (GetAnyControllerPressedStart())
				{
					SystemAudio.Play(Constants.Data.m_soundBounce);
					if (Singleton<SystemUI>.Get.GetCutscene().IsFinished())
					{
						SetState(eState.Join);
						return;
					}
					Singleton<SystemUI>.Get.GetCutscene().Advance();
					m_blockInput = m_cutsceneBlocktime;
				}
			}
		}
		else if (m_state == eState.Join)
		{
			if (m_blockInput > 0f)
			{
				return;
			}
			CheckPlayerControllerAssignment();
			for (int num = m_playerControllers.Count - 1; num >= 0; num--)
			{
				if (!m_playerControllers[num].GetReady() && m_playerControllers[num].Back.WasPressed)
				{
					RemoveController(m_playerControllers[num].GetDeviceId());
				}
			}
			foreach (PlayerController playerController in m_playerControllers)
			{
				int team = playerController.GetTeam();
				if (playerController.GetReady())
				{
					if (playerController.Back.WasPressed)
					{
						playerController.SetReady(false);
					}
					continue;
				}
				if (playerController.Left.WasPressed)
				{
					team = ((team == 1) ? (-1) : 0);
				}
				else if (playerController.Right.WasPressed)
				{
					team = ((team != 0) ? 1 : (-1));
				}
				if (team != playerController.GetTeam())
				{
					SystemAudio.Play(m_soundChooseTeam);
					if (team == -1)
					{
						playerController.OnSetTeam(team);
					}
					else
					{
						int teamPlayers = 0;
						m_playerControllers.ForEach(delegate(PlayerController item)
						{
							if (item.GetTeam() == team)
							{
								teamPlayers++;
							}
						});
						if ((float)teamPlayers < (float)m_playerCount * 0.5f)
						{
							playerController.OnSetTeam(team);
						}
					}
				}
				if (team != -1 && playerController.Start.WasPressed)
				{
					SystemAudio.Play(m_soundReady);
					playerController.SetReady();
				}
			}
			if (Singleton<SystemUI>.Get.GetMenuJoin().GetReady() && m_playerControllers.Exists((PlayerController item) => item.GetTeam() != -1 && item.GetReady()))
			{
				SetState(eState.StartPause);
			}
		}
		else if (m_state == eState.StartPause)
		{
			m_startPauseTimer -= Time.deltaTime;
			if (m_startPauseTimer <= 0f)
			{
				SetState(eState.Playing);
			}
			UpdateControlsUI();
		}
		else if (m_state == eState.Playing)
		{
			UpdateControlsUI();
			if (GetPlayTimer() > m_weaponMinPlayTimeRemaining || m_weaponSpawnTimer > 5f)
			{
				m_weaponSpawnTimer -= Time.deltaTime;
			}
			if (m_weaponSpawnTimer <= 0f)
			{
				m_weaponSpawnTimer = m_weaponSpawnTime.GetRandom();
				SpawnWeapon();
			}
			if (!m_throwInActive || m_playTimer > 20f)
			{
				m_playTimer -= Time.deltaTime;
			}
			if (m_playTimer <= 0f)
			{
				m_playTimer = 0f;
				SetState(eState.GameOver);
			}
		}
		else if (m_state == eState.GameOver)
		{
			m_restartTimer -= Time.deltaTime;
			if (m_restartTimer <= 0f && Singleton<Commentary>.Get.GetCurrentlyPlayingTimeFromEnd() < 3f)
			{
				SetState(eState.StartPause);
			}
			UpdateControlsUI();
		}
	}

	private void CreateTeams()
	{
		for (int i = 0; i < m_teamPrefabs.Length; i++)
		{
			Team component = UnityEngine.Object.Instantiate(m_teamPrefabs[i]).GetComponent<Team>();
			m_teams.Add(component);
			Court.TeamData teamData = m_court.GetTeamData()[i];
			component.SetAttackHoop(teamData.m_attackHoop);
			component.SetDefendHoop(teamData.m_defendHoop);
			component.SetPlayerSpawns(teamData.m_playerSpawns);
			component.SetAttackPositions(teamData.m_attackPositions);
			component.SetShootPositions(teamData.m_shootPositions);
		}
	}

	private void CreatePlayers()
	{
		for (int i = 0; i < m_playerCount; i++)
		{
			int index = i % m_teams.Count;
			Team team = m_teams[index];
			Player component = UnityEngine.Object.Instantiate(team.GetPlayerPrefab()).GetComponent<Player>();
			m_players.Add(component);
			component.SetTeam(team, i / m_teams.Count);
			team.AssignPlayer(component);
			component.SetAI(true);
			Transform[] playerSpawns = team.GetPlayerSpawns();
			component.transform.position = playerSpawns[(team.GetPlayers().Count - 1) % playerSpawns.Length].position;
		}
		foreach (Team team2 in m_teams)
		{
			Debug.Log("Team - " + team2.GetDisplayName() + ": " + team2.GetPlayers().Count + " players");
		}
	}

	private void AssignControllersToPlayers()
	{
		foreach (PlayerController playerController in m_playerControllers)
		{
			Player player = m_teams[playerController.GetTeam()].GetPlayers().Find((Player item) => item.GetPlayerController() == null);
			AssignController(playerController, player);
		}
	}

	private void CreateBall()
	{
		Basketball component = UnityEngine.Object.Instantiate(m_basketballPrefab).GetComponent<Basketball>();
		m_basketBalls.Add(component);
		component.ThrowUp(m_court.GetBallSpawn().position);
		SystemAudio.Play(m_throwUp);
	}

	private void DestroyGame()
	{
		StopAllCoroutines();
		if ((bool)m_camera)
		{
			UnityEngine.Object.DestroyImmediate(m_camera.gameObject);
		}
		foreach (Player player in m_players)
		{
			UnityEngine.Object.Destroy(player.gameObject);
		}
		m_players.Clear();
		foreach (Team team in m_teams)
		{
			UnityEngine.Object.Destroy(team.gameObject);
		}
		m_teams.Clear();
		foreach (Basketball basketBall in m_basketBalls)
		{
			UnityEngine.Object.Destroy(basketBall.gameObject);
		}
		m_basketBalls.Clear();
		foreach (GameObject weapon in m_weapons)
		{
			UnityEngine.Object.Destroy(weapon);
		}
		m_weapons.Clear();
	}

	private void Awake()
	{
		SetSingleton();
		m_court = UnityEngine.Object.FindObjectOfType<Court>();
		m_weaponSpawnTimer = m_weaponSpawnTime.GetRandom();
		SetState(eState.SeaDads);
		m_difficulty = (eDifficulty)PlayerPrefs.GetInt("AI");
	}

	private void SetState(eState state)
	{
		eState state2 = m_state;
		m_state = state;
		switch (state)
		{
		case eState.SeaDads:
			Singleton<SystemUI>.Get.SetState(SystemUI.State.SeaDads);
			m_blockInput = 0.6f;
			break;
		case eState.Title:
			Singleton<SystemUI>.Get.SetState(SystemUI.State.Title);
			m_blockInput = 0.8f;
			SystemAudio.PlayMusic(m_musicIntro, 0f);
			SystemAudio.Play(Constants.Data.m_soundBackboard);
			SystemAudio.Play(m_throwUp);
			break;
		case eState.IntroCutscene:
			Singleton<SystemUI>.Get.ShowCutscene(m_introCutscene);
			m_blockInput = m_cutsceneBlocktime;
			SystemAudio.Play(Constants.Data.m_soundBounce);
			break;
		case eState.Join:
			m_blockInput = 0f;
			Singleton<SystemUI>.Get.SetState(SystemUI.State.Join);
			if (state2 > eState.Join)
			{
				DestroyGame();
				m_playerControllers.ForEach(delegate(PlayerController item)
				{
					item.SetReady(false);
				});
				SystemAudio.PlayMusic(m_musicIntro, 0f);
			}
			m_gameStartCommentaryPlayed = false;
			m_camera = UnityEngine.Object.Instantiate(m_cameraPrefab);
			if (m_crowdAmbienceSource == null)
			{
				m_crowdAmbienceSource = SystemAudio.Play(m_crowdAmbience);
			}
			break;
		case eState.StartPause:
			m_startPauseTimer = ((state2 != eState.Join) ? 3f : 6f);
			m_playTimer = m_playDuration;
			m_throwInActive = false;
			DestroyGame();
			m_camera = UnityEngine.Object.Instantiate(m_cameraPrefab);
			if (!m_gameStartCommentaryPlayed)
			{
				SystemAudio.PlayMusic(m_music, 1f);
				Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.GameStart);
				m_gameStartCommentaryPlayed = true;
			}
			CreateTeams();
			CreatePlayers();
			AssignControllersToPlayers();
			m_players.ForEach(delegate(Player item)
			{
				item.ShowName(6f);
			});
			Singleton<SystemUI>.Get.SetState(SystemUI.State.HUD);
			break;
		case eState.Playing:
		{
			CreateBall();
			FollowCamera component = m_camera.GetComponent<FollowCamera>();
			if (GetNumHumanPlayers() == 1)
			{
				component.SetTarget(m_players.Find((Player item) => !item.GetIsAI()).transform);
			}
			else
			{
				component.SetTarget(m_basketBalls[0].transform);
			}
			break;
		}
		case eState.GameOver:
			Singleton<SystemUI>.Get.SetState(SystemUI.State.Results);
			Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.GameEnd);
			m_restartTimer = 8f;
			break;
		}
	}

	private IEnumerator CoroutineOnScoreSequence(Basketball ball, Hoop hoop, Team team, bool dunk)
	{
		yield return new WaitForSeconds(0.2f);
		while (ball.transform.position.y > 0.5f)
		{
			yield return new WaitForEndOfFrame();
		}
		float direction = Mathf.Sign(hoop.GetBackboard().transform.position.x);
		Vector3 throwInPos = new Vector3(direction * 14.38f, 0f, 0f);
		float closestDist = float.MaxValue;
		Player playerThrowIn = null;
		bool hasAI = team.HasAIPlayer();
		foreach (Player plr in team.GetPlayers())
		{
			float dist = (plr.transform.position - ball.transform.position).sqrMagnitude;
			if (dist < closestDist && (!hasAI || plr.GetIsAI()))
			{
				playerThrowIn = plr;
				closestDist = dist;
			}
		}
		playerThrowIn.StartThrowIn(ball, direction, throwInPos);
		while (playerThrowIn.GetThrowingIn())
		{
			yield return new WaitForEndOfFrame();
		}
		m_throwInActive = false;
	}

	private void CheckPlayerControllerAssignment()
	{
		if (m_playerControllers.Count >= m_playerCount)
		{
			return;
		}
		if (!GetControllerCreated(PlayerController.eDeviceId.KeyboardA) && (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.X) || Input.GetKeyDown(KeyCode.Return)))
		{
			m_playerControllers.Add(PlayerController.CreatePlayerInput(PlayerController.eDeviceId.KeyboardA));
		}
		for (int i = 0; i < InputManager.Devices.Count; i++)
		{
			InputDevice inputDevice = InputManager.Devices[i];
			if (!GetControllerCreated((PlayerController.eDeviceId)i) && inputDevice.AnyButton.WasPressed && !inputDevice.Action2.WasPressed)
			{
				m_playerControllers.Add(PlayerController.CreatePlayerInput((PlayerController.eDeviceId)i));
			}
		}
	}

	private bool GetControllerCreated(PlayerController.eDeviceId deviceId)
	{
		return m_playerControllers.Exists((PlayerController item) => item.GetDeviceId() == deviceId);
	}

	private void RemoveController(PlayerController.eDeviceId deviceId)
	{
		PlayerController playerController = m_playerControllers.Find((PlayerController item) => item.GetDeviceId() == deviceId);
		if (playerController != null)
		{
			playerController.Destroy();
			m_playerControllers.Remove(playerController);
		}
	}

	private void AssignController(PlayerController.eDeviceId deviceId, Player player)
	{
		PlayerController playerController = m_playerControllers.Find((PlayerController item) => item.GetDeviceId() == deviceId);
		if (playerController != null)
		{
			player.AssignPlayerController(playerController);
			playerController.OnAssignPlayer(player);
		}
	}

	private void AssignController(PlayerController controller, Player player)
	{
		if (controller != null && !(player == null))
		{
			player.AssignPlayerController(controller);
			controller.OnAssignPlayer(player);
		}
	}

	private bool GetAnyControllerPressedStart()
	{
		return m_playerControllers.Exists((PlayerController item) => item.Start.WasPressed);
	}

	private bool GetAnyControllerPressedBack()
	{
		return m_playerControllers.Exists((PlayerController item) => item.Back.WasPressed);
	}

	private int GetNumHumanPlayers()
	{
		int result = 0;
		m_players.ForEach(delegate(Player player)
		{
			if (!player.GetIsAI())
			{
				result++;
			}
		});
		return result;
	}

	public static int CalcSpriteDepth(Vector3 pos)
	{
		return Mathf.RoundToInt(Mathf.Lerp(32767f, -32768f, 0.5f + pos.z * 0.1f));
	}

	private void SpawnWeapon()
	{
		float totalChance = 0f;
		Array.ForEach(m_weaponPrefabs, delegate(Weapon item)
		{
			totalChance += item.GetSpawnChance();
		});
		float num = UnityEngine.Random.Range(0f, totalChance);
		GameObject gameObject = null;
		for (int num2 = 0; num2 < m_weaponPrefabs.Length; num2++)
		{
			num -= m_weaponPrefabs[num2].GetSpawnChance();
			if (num <= 0f)
			{
				gameObject = m_weaponPrefabs[num2].gameObject;
				break;
			}
		}
		if (!(gameObject == null))
		{
			m_weapons.Add(gameObject.Spawn());
		}
	}

	private void UpdateControlsUI()
	{
		if (Input.GetKey(KeyCode.F1))
		{
			m_controlsTimer = 1f;
			Singleton<SystemUI>.Get.ShowControlsPrompt(true);
		}
		else if (m_controlsTimer > 0f)
		{
			m_controlsTimer -= Time.deltaTime;
			if (m_controlsTimer <= 0f)
			{
				Singleton<SystemUI>.Get.ShowControlsPrompt(false);
			}
		}
	}
}
